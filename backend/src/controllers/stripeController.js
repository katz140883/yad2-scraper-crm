/**
 * Stripe Controller
 * 
 * Handles payment processing with Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Create a checkout session for subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { plan_type = 'basic_monthly' } = req.body;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findByUserId(userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User already has an active subscription' 
      });
    }
    
    // Create or update Stripe customer
    let stripeCustomerId = user.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: {
          user_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await User.update(userId, { stripe_customer_id: stripeCustomerId });
    }
    
    // Define price ID based on plan type
    let priceId;
    switch (plan_type) {
      case 'basic_monthly':
        priceId = process.env.STRIPE_BASIC_MONTHLY_PRICE_ID;
        break;
      // Add more plan types as needed
      default:
        priceId = process.env.STRIPE_BASIC_MONTHLY_PRICE_ID;
    }
    
    if (!priceId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid plan type or price ID not configured' 
      });
    }
    
    // Create a new subscription record (inactive until payment)
    let subscription;
    if (!existingSubscription) {
      subscription = await Subscription.create({
        user_id: userId,
        plan_type,
        status: 'pending',
        stripe_customer_id: stripeCustomerId
      });
    } else {
      subscription = await Subscription.update(existingSubscription.subscription_id, {
        plan_type,
        status: 'pending',
        stripe_customer_id: stripeCustomerId
      });
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        user_id: userId,
        subscription_id: subscription.subscription_id
      }
    });
    
    res.status(200).json({ 
      status: 'success', 
      session_id: session.id,
      checkout_url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create checkout session' });
  }
};

/**
 * Handle Stripe webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  
  // Handle specific events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Extract metadata
      const { user_id, subscription_id } = session.metadata;
      
      if (!user_id || !subscription_id) {
        console.error('Missing metadata in checkout session:', session);
        break;
      }
      
      // Get subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Calculate end date based on billing period
      const startDate = new Date(stripeSubscription.current_period_start * 1000);
      const endDate = new Date(stripeSubscription.current_period_end * 1000);
      
      // Activate subscription
      await Subscription.activate(subscription_id, {
        start_date: startDate,
        end_date: endDate,
        stripe_subscription_id: session.subscription
      });
      
      console.log(`Subscription ${subscription_id} activated for user ${user_id}`);
      break;
    }
    
    case 'customer.subscription.updated': {
      const stripeSubscription = event.data.object;
      
      // Find subscription by Stripe subscription ID
      const subscription = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
      
      if (!subscription) {
        console.error('Subscription not found for Stripe subscription ID:', stripeSubscription.id);
        break;
      }
      
      // Update subscription status based on Stripe status
      let status;
      switch (stripeSubscription.status) {
        case 'active':
          status = 'active';
          break;
        case 'past_due':
          status = 'past_due';
          break;
        case 'unpaid':
          status = 'unpaid';
          break;
        case 'canceled':
          status = 'cancelled';
          break;
        default:
          status = stripeSubscription.status;
      }
      
      // Calculate end date based on billing period
      const endDate = new Date(stripeSubscription.current_period_end * 1000);
      
      // Update subscription
      await Subscription.update(subscription.subscription_id, {
        status,
        end_date: endDate
      });
      
      console.log(`Subscription ${subscription.subscription_id} updated to status: ${status}`);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object;
      
      // Find subscription by Stripe subscription ID
      const subscription = await Subscription.findByStripeSubscriptionId(stripeSubscription.id);
      
      if (!subscription) {
        console.error('Subscription not found for Stripe subscription ID:', stripeSubscription.id);
        break;
      }
      
      // Cancel subscription
      await Subscription.cancel(subscription.subscription_id);
      
      console.log(`Subscription ${subscription.subscription_id} cancelled`);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.status(200).json({ received: true });
};

/**
 * Get subscription status for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Get subscription
    const subscription = await Subscription.findByUserId(userId);
    
    if (!subscription) {
      return res.status(200).json({ 
        status: 'success', 
        data: { 
          has_subscription: false 
        } 
      });
    }
    
    // Check if subscription is active
    const isActive = subscription.status === 'active' && 
                     subscription.end_date && 
                     new Date(subscription.end_date) > new Date();
    
    res.status(200).json({
      status: 'success',
      data: {
        has_subscription: true,
        subscription: {
          id: subscription.subscription_id,
          plan_type: subscription.plan_type,
          status: subscription.status,
          is_active: isActive,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          created_at: subscription.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get subscription status' });
  }
};

/**
 * Cancel subscription for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Get subscription
    const subscription = await Subscription.findByUserId(userId);
    
    if (!subscription) {
      return res.status(404).json({ status: 'error', message: 'Subscription not found' });
    }
    
    if (subscription.status !== 'active') {
      return res.status(400).json({ status: 'error', message: 'Subscription is not active' });
    }
    
    if (!subscription.stripe_subscription_id) {
      return res.status(400).json({ status: 'error', message: 'No Stripe subscription ID found' });
    }
    
    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    
    // Cancel subscription in database
    await Subscription.cancel(subscription.subscription_id);
    
    res.status(200).json({ status: 'success', message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cancel subscription' });
  }
};

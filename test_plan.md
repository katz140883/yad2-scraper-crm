# Test Plan for Yad2 CRM System

## 1. Environment Setup Tests
- [ ] Backend environment variables configured correctly
- [ ] Frontend environment variables configured correctly
- [ ] Database connection successful
- [ ] Scraper configuration valid

## 2. User Authentication Tests
- [ ] User registration works correctly
- [ ] User login works correctly
- [ ] JWT token generation and validation works
- [ ] Protected routes require authentication

## 3. Subscription and Payment Tests
- [ ] Stripe checkout session creation works
- [ ] Webhook handling for subscription events works
- [ ] Subscription status updates correctly in database
- [ ] User access restricted based on subscription status

## 4. WhatsApp Integration Tests
- [ ] QR code generation works
- [ ] WhatsApp client initialization works
- [ ] Session persistence works
- [ ] Message sending to leads works

## 5. Scraper Integration Tests
- [ ] Scraper connects to database successfully
- [ ] Scraper filters for private owners correctly
- [ ] Scraper saves leads to database correctly
- [ ] Scraper handles pagination correctly

## 6. Real-time Updates Tests
- [ ] WebSocket connection established successfully
- [ ] New leads appear in real-time
- [ ] Status updates broadcast correctly
- [ ] WhatsApp status updates in real-time

## 7. Admin Panel Tests
- [ ] Admin authentication and authorization works
- [ ] User management functions work
- [ ] Subscription management functions work
- [ ] System statistics display correctly

## 8. End-to-End Flow Tests
- [ ] Complete user journey from registration to lead management
- [ ] Admin journey for monitoring and management
- [ ] Error handling and recovery
- [ ] Performance under load (basic)

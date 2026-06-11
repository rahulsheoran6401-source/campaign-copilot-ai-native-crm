-- Clean up
TRUNCATE TABLE campaign_events, communication_logs, ai_messages, ai_conversations, activity_logs, orders, campaigns, customers CASCADE;

-- Insert Customers
INSERT INTO customers (id, name, email, phone, total_spend, lifetime_value, preferred_channel, churn_risk) VALUES 
('c0000000-0000-0000-0000-000000000001', 'Alice Johnson', 'alice@example.com', '+1234567890', 4200, 4200, 'Email', 'Low'),
('c0000000-0000-0000-0000-000000000002', 'Bob Smith', 'bob@example.com', '+0987654321', 450, 450, 'WhatsApp', 'High'),
('c0000000-0000-0000-0000-000000000003', 'Charlie Davis', 'charlie@example.com', '+1122334455', 1200, 1200, 'SMS', 'Medium'),
('c0000000-0000-0000-0000-000000000004', 'Diana Evans', 'diana@example.com', '+1555666777', 8900, 8900, 'Email', 'Low'),
('c0000000-0000-0000-0000-000000000005', 'Evan Miller', 'evan@example.com', '+1999888777', 150, 150, 'WhatsApp', 'High'),
('c0000000-0000-0000-0000-000000000006', 'Fiona Garcia', 'fiona@example.com', '+1444333222', 2400, 2400, 'Email', 'Low'),
('c0000000-0000-0000-0000-000000000007', 'George Hall', 'george@example.com', '+1777888999', 600, 600, 'SMS', 'Medium'),
('c0000000-0000-0000-0000-000000000008', 'Hannah Irving', 'hannah@example.com', '+1222333444', 3500, 3500, 'WhatsApp', 'Low'),
('c0000000-0000-0000-0000-000000000009', 'Ian Jones', 'ian@example.com', '+1888777666', 120, 120, 'Email', 'High'),
('c0000000-0000-0000-0000-000000000010', 'Julia King', 'julia@example.com', '+1333444555', 5600, 5600, 'SMS', 'Low');

-- Insert Orders
INSERT INTO orders (customer_id, amount, status, created_at) VALUES 
('c0000000-0000-0000-0000-000000000001', 1200, 'Completed', NOW() - INTERVAL '30 days'),
('c0000000-0000-0000-0000-000000000001', 3000, 'Completed', NOW() - INTERVAL '15 days'),
('c0000000-0000-0000-0000-000000000002', 450, 'Completed', NOW() - INTERVAL '60 days'),
('c0000000-0000-0000-0000-000000000003', 1200, 'Completed', NOW() - INTERVAL '45 days'),
('c0000000-0000-0000-0000-000000000004', 8900, 'Completed', NOW() - INTERVAL '5 days'),
('c0000000-0000-0000-0000-000000000005', 150, 'Completed', NOW() - INTERVAL '90 days'),
('c0000000-0000-0000-0000-000000000006', 2400, 'Completed', NOW() - INTERVAL '10 days'),
('c0000000-0000-0000-0000-000000000007', 600, 'Completed', NOW() - INTERVAL '40 days'),
('c0000000-0000-0000-0000-000000000008', 3500, 'Completed', NOW() - INTERVAL '20 days'),
('c0000000-0000-0000-0000-000000000009', 120, 'Completed', NOW() - INTERVAL '100 days'),
('c0000000-0000-0000-0000-000000000010', 5600, 'Completed', NOW() - INTERVAL '2 days');

-- Insert Campaigns
INSERT INTO campaigns (id, name, status, channel, message, audience_size) VALUES 
('ca000000-0000-0000-0000-000000000001', 'Win-back Inactive Users', 'Completed', 'Email', 'We miss you! Here is 20% off your next purchase.', 150),
('ca000000-0000-0000-0000-000000000002', 'Summer Weekend Sale', 'Running', 'WhatsApp', 'Flash sale this weekend! Reply YES for early access.', 1000),
('ca000000-0000-0000-0000-000000000003', 'VIP Members Exclusive', 'Scheduled', 'SMS', 'Your VIP status gets you a sneak peek at the new collection.', 45),
('ca000000-0000-0000-0000-000000000004', 'New Arrival Drop', 'Draft', 'Email', 'Check out the new arrivals this week.', 800);

-- Insert Communication Logs & Campaign Events (to populate analytics)
-- Campaign 1
INSERT INTO communication_logs (campaign_id, customer_id, status, channel, timestamp) VALUES 
('ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Converted', 'Email', NOW() - INTERVAL '5 days'),
('ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Opened', 'Email', NOW() - INTERVAL '5 days'),
('ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'Delivered', 'Email', NOW() - INTERVAL '5 days');

INSERT INTO campaign_events (campaign_id, event_type, revenue_generated, created_at) VALUES 
('ca000000-0000-0000-0000-000000000001', 'Converted', 450, NOW() - INTERVAL '5 days');

-- Campaign 2
INSERT INTO communication_logs (campaign_id, customer_id, status, channel, timestamp) VALUES 
('ca000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Converted', 'WhatsApp', NOW() - INTERVAL '1 days'),
('ca000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'Converted', 'WhatsApp', NOW() - INTERVAL '1 days'),
('ca000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006', 'Clicked', 'WhatsApp', NOW() - INTERVAL '1 days'),
('ca000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000008', 'Opened', 'WhatsApp', NOW() - INTERVAL '1 days');

INSERT INTO campaign_events (campaign_id, event_type, revenue_generated, created_at) VALUES 
('ca000000-0000-0000-0000-000000000002', 'Converted', 1200, NOW() - INTERVAL '1 days'),
('ca000000-0000-0000-0000-000000000002', 'Converted', 8900, NOW() - INTERVAL '1 days');

-- Activity Logs
INSERT INTO activity_logs (action, entity_type, details, created_at) VALUES
('Created Campaign', 'Campaign', '{"name": "New Arrival Drop"}', NOW() - INTERVAL '2 days'),
('Scheduled Campaign', 'Campaign', '{"name": "VIP Members Exclusive"}', NOW() - INTERVAL '3 days'),
('Created Order', 'Order', '{"amount": 5600}', NOW() - INTERVAL '2 days'),
('Added Customer', 'Customer', '{"name": "Julia King"}', NOW() - INTERVAL '3 days');

# Property Requests Feature

This feature allows clients to post property requests and landlords/agents to comment on them.

## Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL script in `supabase/property_requests_setup.sql`

This will create:
- `property_requests` table for storing property requests
- `request_comments` table for storing comments on requests
- Proper RLS policies for security
- Indexes for performance

## Features

- **Clients** can post requests for specific house types, locations, and max rent with a deadline
- **Deadline-based expiry**: Requests are automatically deleted 1 day after the deadline passes
- **Landlords/Agents** can comment on requests to offer properties or ask for more details
- **Anonymous posting** is allowed for requests
- **Real-time updates** when new requests or comments are added
- **Deadline visibility**: Shows when each request expires

## Tables Structure

### property_requests
- `id`: UUID (Primary Key)
- `house_type`: TEXT (e.g., "2BR apartment", "villa")
- `location`: TEXT (normalized location)
- `max_rent`: INTEGER (in KSh)
- `deadline`: TIMESTAMP (when the request expires + 1 day)
- `user_id`: UUID (nullable for anonymous)
- `user_email`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Auto-Expiry System

Requests are automatically deleted 1 day after their deadline:
- Deadline is set by the user when creating a request
- The system checks expiry when loading requests
- Expired requests are automatically removed from the database and UI
- No manual cleanup needed - fully automated!

### request_comments
- `id`: UUID (Primary Key)
- `request_id`: UUID (Foreign Key to property_requests)
- `comment`: TEXT
- `user_id`: UUID (nullable for anonymous)
- `user_email`: TEXT
- `user_type`: TEXT (default 'anonymous')
- `created_at`: TIMESTAMP
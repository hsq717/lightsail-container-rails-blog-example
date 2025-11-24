# Blog Application

A Ruby on Rails blog application with AWS RDS and S3 integration.

## Features

- Create, read, update, and delete blog posts
- Add comments to blog posts
- Upload multiple images per post
- AWS RDS database support for production
- AWS S3 storage for image uploads
- Responsive design

## Setup Instructions

### Development Setup

1. **Install Dependencies**
   ```bash
   bundle install
   ```

2. **Database Setup**
   ```bash
   rails db:create
   rails db:migrate
   ```

3. **Start the Server**
   ```bash
   rails server
   ```

4. **Visit the Application**
   Open your browser and go to `http://localhost:3000`

### Production Setup with AWS

1. **AWS RDS Setup**
   - Create a PostgreSQL RDS instance
   - Note the endpoint, username, password, and database name

2. **AWS S3 Setup**
   - Create an S3 bucket for file storage
   - Create IAM user with S3 access permissions
   - Note the access key ID and secret access key

3. **Environment Variables**
   Set the following environment variables in your production environment:

   ```bash
   # Database Configuration
   DATABASE_NAME=your_database_name
   DATABASE_USERNAME=your_rds_username
   DATABASE_PASSWORD=your_rds_password
   DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DATABASE_PORT=5432

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=your_aws_region
   S3_BUCKET_NAME=your-s3-bucket-name

   # Rails Configuration
   RAILS_ENV=production
   ```

4. **Deploy to Production**
   ```bash
   # Install production gems
   bundle install --without development test
   
   # Precompile assets
   rails assets:precompile
   
   # Run database migrations
   rails db:create RAILS_ENV=production
   rails db:migrate RAILS_ENV=production
   
   # Start the server
   rails server -e production
   ```

## Usage

### Creating Blog Posts

1. Click "New Post" on the homepage
2. Fill in the title, author, and content
3. Optionally upload images
4. Check "Publish immediately" to make the post visible
5. Click "Create Post"

### Adding Comments

1. Navigate to any blog post
2. Scroll down to the comments section
3. Fill in your name and comment
4. Click "Post Comment"

### Managing Posts

- **Edit**: Click the "Edit" button on any post
- **Delete**: Click the "Delete" button and confirm
- **View**: Click on the post title to view the full post

## File Structure

```
blog_app/
├── app/
│   ├── controllers/
│   │   ├── posts_controller.rb
│   │   └── comments_controller.rb
│   ├── models/
│   │   ├── post.rb
│   │   └── comment.rb
│   └── views/
│       └── posts/
├── config/
│   ├── database.yml
│   ├── storage.yml
│   └── routes.rb
└── db/
    └── migrate/
```

## Technologies Used

- Ruby on Rails 8.0
- SQLite (development)
- PostgreSQL (production)
- AWS RDS
- AWS S3
- Active Storage
- HTML/CSS/JavaScript

## License

This project is open source and available under the [MIT License](LICENSE).
# lightsail-container-rails-blog-example

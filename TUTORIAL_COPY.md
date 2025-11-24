# Ruby on Rails Blog Tutorial: From Scratch to AWS Deployment

This tutorial will guide you through creating a complete Ruby on Rails blog application with AWS RDS and S3 integration from scratch.

## Prerequisites

- Ruby 3.3+ installed (using rbenv recommended)
- Basic knowledge of Ruby and Rails
- AWS account (for production deployment)
- Git installed

## Step 1: Create a New Rails Application

```bash
# Create new Rails app with PostgreSQL (for production compatibility)
rails new blog_app --database=postgresql

# Navigate to the project directory
cd blog_app
```

## Step 2: Update Gemfile for Development and AWS Integration

Edit `Gemfile` to add necessary gems:

```ruby
# Replace the pg gem line with:
gem "sqlite3", ">= 1.4"  # For development
gem "pg", "~> 1.1", group: :production  # For production

# Add these gems:
gem "image_processing", "~> 1.2"  # For image processing
gem "aws-sdk-s3", require: false  # For S3 integration
```

Install the gems:
```bash
bundle install
```

## Step 3: Configure Database

Update `config/database.yml`:

```yaml
# SQLite for development and test
default: &default
  adapter: sqlite3
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000

development:
  <<: *default
  database: storage/development.sqlite3

test:
  <<: *default
  database: storage/test.sqlite3

# PostgreSQL for production (AWS RDS)
production:
  primary: &primary_production
    adapter: postgresql
    encoding: unicode
    pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
    database: <%= ENV.fetch("DATABASE_NAME") { "blog_app_production" } %>
    username: <%= ENV.fetch("DATABASE_USERNAME") { "blog_app" } %>
    password: <%= ENV["DATABASE_PASSWORD"] %>
    host: <%= ENV.fetch("DATABASE_HOST") { "localhost" } %>
    port: <%= ENV.fetch("DATABASE_PORT") { 5432 } %>
  cache:
    <<: *primary_production
    database: <%= ENV.fetch("DATABASE_NAME") { "blog_app_production" } %>_cache
    migrations_paths: db/cache_migrate
  queue:
    <<: *primary_production
    database: <%= ENV.fetch("DATABASE_NAME") { "blog_app_production" } %>_queue
    migrations_paths: db/queue_migrate
  cable:
    <<: *primary_production
    database: <%= ENV.fetch("DATABASE_NAME") { "blog_app_production" } %>_cable
    migrations_paths: db/cable_migrate
```

## Step 4: Configure Active Storage for S3

Update `config/storage.yml`:

```yaml
# Add S3 configuration
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV.fetch('AWS_REGION') { 'us-east-1' } %>
  bucket: <%= ENV.fetch('S3_BUCKET_NAME') { 'blog-app-storage' } %>-<%= Rails.env %>
```

Update environment configurations:

**config/environments/development.rb:**
```ruby
# Replace the active_storage line with:
config.active_storage.service = ENV['AWS_ACCESS_KEY_ID'].present? ? :amazon : :local
```

**config/environments/production.rb:**
```ruby
# Replace the active_storage line with:
config.active_storage.service = :amazon
```

## Step 5: Generate Models

Create the Post model:
```bash
rails generate model Post title:string content:text author:string published:boolean
```

Create the Comment model:
```bash
rails generate model Comment post:references author:string content:text
```

## Step 6: Update Models with Relationships and Validations

**app/models/post.rb:**
```ruby
class Post < ApplicationRecord
  has_many :comments, dependent: :destroy
  has_many_attached :images
  
  validates :title, presence: true
  validates :content, presence: true
  validates :author, presence: true
  
  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }
end
```

**app/models/comment.rb:**
```ruby
class Comment < ApplicationRecord
  belongs_to :post
  
  validates :author, presence: true
  validates :content, presence: true
end
```

## Step 7: Generate Controllers

Generate Posts controller:
```bash
rails generate controller Posts index show new create edit update destroy
```

Generate Comments controller:
```bash
rails generate controller Comments create destroy
```

## Step 8: Configure Routes

Update `config/routes.rb`:
```ruby
Rails.application.routes.draw do
  root "posts#index"
  
  resources :posts do
    resources :comments, only: [:create, :destroy]
  end
  
  get "up" => "rails/health#show", as: :rails_health_check
end
```

## Step 9: Implement Controllers

**app/controllers/posts_controller.rb:**
```ruby
class PostsController < ApplicationController
  before_action :set_post, only: [:show, :edit, :update, :destroy]

  def index
    @posts = Post.published.recent.includes(:comments)
  end

  def show
    @comment = Comment.new
  end

  def new
    @post = Post.new
  end

  def create
    @post = Post.new(post_params)
    
    if @post.save
      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: 'Post was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post.destroy
    redirect_to posts_url, notice: 'Post was successfully deleted.'
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:title, :content, :author, :published, images: [])
  end
end
```

**app/controllers/comments_controller.rb:**
```ruby
class CommentsController < ApplicationController
  before_action :set_post
  before_action :set_comment, only: [:destroy]

  def create
    @comment = @post.comments.build(comment_params)
    
    if @comment.save
      redirect_to @post, notice: 'Comment was successfully added.'
    else
      redirect_to @post, alert: 'Error adding comment.'
    end
  end

  def destroy
    @comment.destroy
    redirect_to @post, notice: 'Comment was successfully deleted.'
  end

  private

  def set_post
    @post = Post.find(params[:post_id])
  end

  def set_comment
    @comment = @post.comments.find(params[:id])
  end

  def comment_params
    params.require(:comment).permit(:author, :content)
  end
end
```

## Step 10: Create Views

**app/views/posts/index.html.erb:**
```erb
<div class="container">
  <div class="header">
    <h1>Blog Posts</h1>
    <%= link_to 'New Post', new_post_path, class: 'btn btn-primary' %>
  </div>

  <div class="posts">
    <% if @posts.any? %>
      <% @posts.each do |post| %>
        <article class="post-card">
          <h2><%= link_to post.title, post %></h2>
          <div class="post-meta">
            <span>By <%= post.author %></span>
            <span><%= post.created_at.strftime("%B %d, %Y") %></span>
            <span><%= pluralize(post.comments.count, 'comment') %></span>
          </div>
          <div class="post-content">
            <%= truncate(post.content, length: 200) %>
          </div>
          <% if post.images.any? %>
            <div class="post-images">
              <% post.images.first(3).each do |image| %>
                <%= image_tag image, class: 'post-thumbnail' %>
              <% end %>
            </div>
          <% end %>
          <div class="post-actions">
            <%= link_to 'Read More', post, class: 'btn btn-outline' %>
            <%= link_to 'Edit', edit_post_path(post), class: 'btn btn-secondary' %>
            <%= link_to 'Delete', post, data: { turbo_method: :delete, turbo_confirm: 'Are you sure?' }, class: 'btn btn-danger' %>
          </div>
        </article>
      <% end %>
    <% else %>
      <div class="empty-state">
        <h3>No posts yet</h3>
        <p>Be the first to create a blog post!</p>
        <%= link_to 'Create First Post', new_post_path, class: 'btn btn-primary' %>
      </div>
    <% end %>
  </div>
</div>
```

**app/views/posts/show.html.erb:**
```erb
<div class="container">
  <article class="post">
    <header class="post-header">
      <h1><%= @post.title %></h1>
      <div class="post-meta">
        <span>By <%= @post.author %></span>
        <span><%= @post.created_at.strftime("%B %d, %Y at %I:%M %p") %></span>
      </div>
      <div class="post-actions">
        <%= link_to 'Edit', edit_post_path(@post), class: 'btn btn-secondary' %>
        <%= link_to 'Delete', @post, data: { turbo_method: :delete, turbo_confirm: 'Are you sure?' }, class: 'btn btn-danger' %>
        <%= link_to 'Back to Posts', posts_path, class: 'btn btn-outline' %>
      </div>
    </header>

    <div class="post-content">
      <%= simple_format(@post.content) %>
    </div>

    <% if @post.images.any? %>
      <div class="post-images">
        <h3>Images</h3>
        <div class="image-gallery">
          <% @post.images.each do |image| %>
            <div class="image-item">
              <%= image_tag image, class: 'post-image' %>
            </div>
          <% end %>
        </div>
      </div>
    <% end %>
  </article>

  <section class="comments-section">
    <h3>Comments (<%= @post.comments.count %>)</h3>
    
    <div class="comment-form">
      <h4>Add a Comment</h4>
      <%= form_with model: [@post, @comment], local: true do |form| %>
        <div class="form-group">
          <%= form.label :author %>
          <%= form.text_field :author, class: 'form-control', required: true %>
        </div>
        
        <div class="form-group">
          <%= form.label :content %>
          <%= form.text_area :content, rows: 4, class: 'form-control', required: true %>
        </div>
        
        <div class="form-actions">
          <%= form.submit 'Post Comment', class: 'btn btn-primary' %>
        </div>
      <% end %>
    </div>

    <div class="comments">
      <% if @post.comments.any? %>
        <% @post.comments.order(created_at: :desc).each do |comment| %>
          <div class="comment">
            <div class="comment-header">
              <strong><%= comment.author %></strong>
              <span class="comment-date"><%= comment.created_at.strftime("%B %d, %Y at %I:%M %p") %></span>
              <%= link_to 'Delete', [@post, comment], data: { turbo_method: :delete, turbo_confirm: 'Are you sure?' }, class: 'btn btn-sm btn-danger' %>
            </div>
            <div class="comment-content">
              <%= simple_format(comment.content) %>
            </div>
          </div>
        <% end %>
      <% else %>
        <p class="no-comments">No comments yet. Be the first to comment!</p>
      <% end %>
    </div>
  </section>
</div>
```

**app/views/posts/new.html.erb:**
```erb
<div class="container">
  <h1>New Blog Post</h1>

  <%= form_with model: @post, local: true, multipart: true do |form| %>
    <% if @post.errors.any? %>
      <div class="alert alert-danger">
        <h4><%= pluralize(@post.errors.count, "error") %> prohibited this post from being saved:</h4>
        <ul>
          <% @post.errors.full_messages.each do |message| %>
            <li><%= message %></li>
          <% end %>
        </ul>
      </div>
    <% end %>

    <div class="form-group">
      <%= form.label :title %>
      <%= form.text_field :title, class: 'form-control', required: true %>
    </div>

    <div class="form-group">
      <%= form.label :author %>
      <%= form.text_field :author, class: 'form-control', required: true %>
    </div>

    <div class="form-group">
      <%= form.label :content %>
      <%= form.text_area :content, rows: 10, class: 'form-control', required: true %>
    </div>

    <div class="form-group">
      <%= form.label :images, "Upload Images" %>
      <%= form.file_field :images, multiple: true, accept: 'image/*', class: 'form-control', direct_upload: true %>
      <small class="form-text text-muted">You can select multiple images</small>
    </div>

    <div class="form-check">
      <%= form.check_box :published, class: 'form-check-input' %>
      <%= form.label :published, "Publish immediately", class: 'form-check-label' %>
    </div>

    <div class="form-actions">
      <%= form.submit 'Create Post', class: 'btn btn-primary' %>
      <%= link_to 'Cancel', posts_path, class: 'btn btn-secondary' %>
    </div>
  <% end %>
</div>
```

**app/views/posts/edit.html.erb:**
```erb
<div class="container">
  <h1>Edit Post</h1>

  <%= form_with model: @post, local: true, multipart: true do |form| %>
    <% if @post.errors.any? %>
      <div class="alert alert-danger">
        <h4><%= pluralize(@post.errors.count, "error") %> prohibited this post from being saved:</h4>
        <ul>
          <% @post.errors.full_messages.each do |message| %>
            <li><%= message %></li>
          <% end %>
        </ul>
      </div>
    <% end %>

    <div class="form-group">
      <%= form.label :title %>
      <%= form.text_field :title, class: 'form-control', required: true %>
    </div>

    <div class="form-group">
      <%= form.label :author %>
      <%= form.text_field :author, class: 'form-control', required: true %>
    </div>

    <div class="form-group">
      <%= form.label :content %>
      <%= form.text_area :content, rows: 10, class: 'form-control', required: true %>
    </div>

    <% if @post.images.any? %>
      <div class="current-images">
        <h4>Current Images</h4>
        <div class="image-gallery">
          <% @post.images.each do |image| %>
            <div class="image-item">
              <%= image_tag image, class: 'current-image' %>
            </div>
          <% end %>
        </div>
      </div>
    <% end %>

    <div class="form-group">
      <%= form.label :images, "Upload New Images" %>
      <%= form.file_field :images, multiple: true, accept: 'image/*', class: 'form-control' %>
      <small class="form-text text-muted">You can select multiple images. New images will be added to existing ones.</small>
    </div>

    <div class="form-check">
      <%= form.check_box :published, class: 'form-check-input' %>
      <%= form.label :published, "Published", class: 'form-check-label' %>
    </div>

    <div class="form-actions">
      <%= form.submit 'Update Post', class: 'btn btn-primary' %>
      <%= link_to 'Show', @post, class: 'btn btn-secondary' %>
      <%= link_to 'Back', posts_path, class: 'btn btn-outline' %>
    </div>
  <% end %>
</div>
```

## Step 11: Add CSS Styling

Add comprehensive CSS to `app/assets/stylesheets/application.css`:

```css
/* Base styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Header styles */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.header h1 {
  color: #2c3e50;
  margin: 0;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-outline {
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover {
  background-color: #007bff;
  color: white;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Post card styles */
.post-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.post-card h2 {
  margin: 0 0 12px 0;
}

.post-card h2 a {
  color: #2c3e50;
  text-decoration: none;
}

.post-card h2 a:hover {
  color: #007bff;
}

.post-meta {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 16px;
}

.post-meta span {
  margin-right: 16px;
}

.post-content {
  margin-bottom: 16px;
  line-height: 1.7;
}

.post-images {
  margin: 16px 0;
}

.post-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 8px;
}

.post-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Individual post styles */
.post {
  background: white;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.post-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.post-header h1 {
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.post-images .image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.post-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

/* Comments styles */
.comments-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.comment-form {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ecef;
}

.comment {
  padding: 16px 0;
  border-bottom: 1px solid #f8f9fa;
}

.comment:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-date {
  color: #6c757d;
  font-size: 14px;
}

.comment-content {
  line-height: 1.6;
}

.no-comments {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 32px;
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.form-check {
  margin: 16px 0;
}

.form-check-input {
  margin-right: 8px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.form-text {
  font-size: 14px;
  color: #6c757d;
  margin-top: 4px;
}

/* Alert styles */
.alert {
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert h4 {
  margin: 0 0 8px 0;
}

.alert ul {
  margin: 0;
  padding-left: 20px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 64px 32px;
  color: #6c757d;
}

.empty-state h3 {
  margin-bottom: 16px;
  color: #495057;
}

/* Current images in edit form */
.current-images {
  margin: 20px 0;
}

.current-images .image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.current-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .post-actions {
    justify-content: center;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .comment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
```

## Step 12: Setup Database and Active Storage

```bash
# Create and setup database
rails db:create
rails db:migrate

# Install Active Storage
rails active_storage:install
rails db:migrate
```

## Step 13: Create Environment Configuration

Create `.env.example` file:
```bash
# Database Configuration (for AWS RDS in production)
DATABASE_NAME=blog_app_production
DATABASE_USERNAME=your_rds_username
DATABASE_PASSWORD=your_rds_password
DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com
DATABASE_PORT=5432

# AWS S3 Configuration (for Active Storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-west-2
S3_BUCKET_NAME=bucket-rails-joy

# Rails Configuration
RAILS_ENV=production
RAILS_LOG_LEVEL=info
```

## Step 14: Test the Application

```bash
# Start the Rails server
rails server

# Visit http://localhost:3000 in your browser
```

## Step 15: AWS Setup for Production

### AWS RDS Setup

1. **Create RDS Instance:**
   - Go to AWS RDS Console
   - Click "Create database"
   - Choose PostgreSQL
   - Select appropriate instance size
   - Configure security groups to allow connections

2. **Note Connection Details:**
   - Endpoint URL
   - Port (usually 5432)
   - Database name
   - Username and password

### AWS S3 Setup

1. **Create S3 Bucket:**
   - Go to AWS S3 Console
   - Click "Create bucket"
   - Choose unique bucket name
   - Configure appropriate permissions

2. **Create IAM User:**
   - Go to AWS IAM Console
   - Create new user with programmatic access
   - Attach S3 permissions policy
   - Note Access Key ID and Secret Access Key

### Sample IAM Policy for S3:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

## Step 16: Deploy to Production

1. **Set Environment Variables:**
   Set all the environment variables from `.env.example` in your production environment.

2. **Deploy Application:**
   ```bash
   # Install production gems
   bundle install --without development test
   
   # Precompile assets
   RAILS_ENV=production rails assets:precompile
   
   # Setup production database
   RAILS_ENV=production rails db:create
   RAILS_ENV=production rails db:migrate
   
   # Start production server
   RAILS_ENV=production rails server
   ```

## Features Implemented

✅ **CRUD Operations:** Create, read, update, delete blog posts  
✅ **Comments System:** Add and delete comments on posts  
✅ **Image Uploads:** Multiple image uploads per post  
✅ **AWS RDS Integration:** PostgreSQL database in production  
✅ **AWS S3 Integration:** File storage for images  
✅ **Responsive Design:** Mobile-friendly interface  
✅ **Validation:** Form validation and error handling  
✅ **Publishing Control:** Draft and published post states  

## Next Steps

- Add user authentication (Devise gem)
- Implement rich text editing (Action Text)
- Add pagination for posts
- Implement search functionality
- Add email notifications for comments
- Set up automated deployment (CI/CD)
- Add caching for better performance
- Implement SEO optimizations

## ActiveStorage Direct Upload & Error Handling

### Direct Upload Feature

This application includes **direct upload** functionality for better user experience:

```erb
<%= form.file_field :images, multiple: true, accept: 'image/*', 
                    class: 'form-control', direct_upload: true %>
```

**Benefits of Direct Upload:**
- Files upload directly to S3 (in production) without going through your Rails server
- Reduces server load and improves upload performance
- Better user experience with upload progress indicators
- Automatic retry on failed uploads

### ActiveStorage Error Handling

The application includes robust error handling for ActiveStorage "blob is nil" issues:

**Model-Level Protection:**
```ruby
# app/models/post.rb
def valid_images
  images.select { |image| image.blob.present? }
end
```

**Controller-Level Error Handling:**
```ruby
# app/controllers/posts_controller.rb
rescue ActiveSupport::DelegationError => e
  Rails.logger.error "ActiveStorage error: #{e.message}"
  @post.errors.add(:images, "There was an error uploading one or more images. Please try again.")
  render :new, status: :unprocessable_entity
end
```

**View-Level Safety:**
```erb
<!-- Use valid_images instead of images to prevent errors -->
<% if @post.valid_images.any? %>
  <% @post.valid_images.each do |image| %>
    <%= image_tag image, class: 'post-image' %>
  <% end %>
<% end %>
```

### Maintenance Task

A cleanup task is included to remove orphaned ActiveStorage records:

```bash
# Run the cleanup task periodically
rails active_storage:cleanup
```

This task will:
- Remove orphaned blob records without attachments
- Remove attachment records pointing to missing blobs
- Keep your ActiveStorage tables clean and consistent

## Troubleshooting

**Common Issues:**

1. **Active Storage Error:** Make sure to run `rails active_storage:install` and `rails db:migrate`

2

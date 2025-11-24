class PostsController < ApplicationController
  before_action :set_post, only: [:show, :edit, :update, :destroy]

  def index
    @posts = Post.recent.includes(:comments)
  end

  def show
    @comment = Comment.new
  end

  def new
    @post = Post.new
  end

  def create
    @post = Post.new(post_params)
    @post.published = true
    
    if @post.save
      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  rescue ActiveSupport::DelegationError => e
    # Handle the specific case where blob is nil
    Rails.logger.error "ActiveStorage error: #{e.message}"
    @post.errors.add(:images, "There was an error uploading one or more images. Please try again.")
    render :new, status: :unprocessable_entity
  end

  def edit
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: 'Post was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  rescue ActiveSupport::DelegationError => e
    # Handle the specific case where blob is nil
    Rails.logger.error "ActiveStorage error: #{e.message}"
    @post.errors.add(:images, "There was an error uploading one or more images. Please try again.")
    render :edit, status: :unprocessable_entity
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
    params.require(:post).permit(:title, :content, :author, images: [])
  end
end

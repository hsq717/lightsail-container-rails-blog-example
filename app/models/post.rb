class Post < ApplicationRecord
  has_many :comments, dependent: :destroy
  has_many_attached :images
  
  validates :title, presence: true
  validates :content, presence: true
  validates :author, presence: true
  
  scope :published, -> { where(published: true) }
  scope :recent, -> { order(created_at: :desc) }
  
  # Helper method to get valid images (with proper blob attachments)
  def valid_images
    images.select { |image| image.blob.present? }
  end
end

class Comment < ApplicationRecord
  belongs_to :post
  
  validates :author, presence: true
  validates :content, presence: true
end

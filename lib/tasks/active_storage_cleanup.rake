namespace :active_storage do
  desc "Clean up orphaned ActiveStorage blobs and attachments"
  task cleanup: :environment do
    puts "Starting ActiveStorage cleanup..."
    
    # Find and remove orphaned blobs (blobs without attachments)
    orphaned_blobs = ActiveStorage::Blob.left_joins(:attachments).where(active_storage_attachments: { id: nil })
    orphaned_count = orphaned_blobs.count
    
    if orphaned_count > 0
      puts "Found #{orphaned_count} orphaned blob(s). Removing..."
      orphaned_blobs.find_each do |blob|
        puts "Removing blob: #{blob.filename} (ID: #{blob.id})"
        blob.purge
      end
      puts "Removed #{orphaned_count} orphaned blob(s)."
    else
      puts "No orphaned blobs found."
    end
    
    # Find and remove attachments with missing blobs
    invalid_attachments = ActiveStorage::Attachment.left_joins(:blob).where(active_storage_blobs: { id: nil })
    invalid_count = invalid_attachments.count
    
    if invalid_count > 0
      puts "Found #{invalid_count} attachment(s) with missing blobs. Removing..."
      invalid_attachments.destroy_all
      puts "Removed #{invalid_count} invalid attachment(s)."
    else
      puts "No invalid attachments found."
    end
    
    puts "ActiveStorage cleanup completed!"
  end
end

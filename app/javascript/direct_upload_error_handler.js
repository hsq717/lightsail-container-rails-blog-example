// Direct Upload Error Handler for ActiveStorage
document.addEventListener('DOMContentLoaded', function() {
  // Handle direct upload events
  document.addEventListener('direct-upload:initialize', function(event) {
    const { target, detail } = event;
    const { id, file } = detail;
    
    console.log(`Starting direct upload for file: ${file.name}`);
    
    // Add a progress indicator
    const progressElement = document.createElement('div');
    progressElement.id = `direct-upload-${id}`;
    progressElement.className = 'direct-upload-progress';
    progressElement.innerHTML = `
      <div class="upload-info">
        <span class="filename">${file.name}</span>
        <span class="status">Uploading...</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;
    
    // Insert progress element after the file input
    target.parentNode.insertBefore(progressElement, target.nextSibling);
  });

  document.addEventListener('direct-upload:start', function(event) {
    const { id } = event.detail;
    console.log(`Direct upload started: ${id}`);
  });

  document.addEventListener('direct-upload:progress', function(event) {
    const { id, progress } = event.detail;
    const progressElement = document.getElementById(`direct-upload-${id}`);
    
    if (progressElement) {
      const progressFill = progressElement.querySelector('.progress-fill');
      const statusElement = progressElement.querySelector('.status');
      
      progressFill.style.width = `${progress}%`;
      statusElement.textContent = `Uploading... ${Math.round(progress)}%`;
    }
  });

  document.addEventListener('direct-upload:end', function(event) {
    const { id } = event.detail;
    const progressElement = document.getElementById(`direct-upload-${id}`);
    
    if (progressElement) {
      const statusElement = progressElement.querySelector('.status');
      statusElement.textContent = 'Upload complete';
      statusElement.className = 'status success';
    }
    
    console.log(`Direct upload completed: ${id}`);
  });

  // This is the key event for catching S3 errors
  document.addEventListener('direct-upload:error', function(event) {
    const { id, error } = event.detail;
    const progressElement = document.getElementById(`direct-upload-${id}`);
    
    console.error('Direct upload failed:', error);
    
    // Update progress element to show error
    if (progressElement) {
      const statusElement = progressElement.querySelector('.status');
      statusElement.textContent = 'Upload failed';
      statusElement.className = 'status error';
      
      // Add error details
      const errorDetails = document.createElement('div');
      errorDetails.className = 'error-details';
      errorDetails.innerHTML = `
        <strong>Error:</strong> ${error.message || 'Unknown error occurred'}
        <br><small>Check console for more details</small>
      `;
      progressElement.appendChild(errorDetails);
    }
    
    // Show user-friendly alert
    alert(`Failed to upload file: ${error.message || 'Unknown error occurred'}\n\nPossible causes:\n- AWS credentials not configured\n- S3 bucket permissions\n- Network connectivity issues\n\nCheck browser console for details.`);
    
    // Log detailed error information
    console.group('Direct Upload Error Details');
    console.error('Error object:', error);
    console.error('Upload ID:', id);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for specific S3 errors
    if (error.message) {
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        console.error('❌ S3 Permission Error: Check AWS credentials and bucket permissions');
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.error('❌ S3 Bucket Error: Check if bucket exists and region is correct');
      } else if (error.message.includes('CORS')) {
        console.error('❌ CORS Error: Check S3 bucket CORS configuration');
      } else if (error.message.includes('NetworkError')) {
        console.error('❌ Network Error: Check internet connection');
      }
    }
    console.groupEnd();
  });

  // Also catch any unhandled promise rejections that might be related to uploads
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('upload') || event.reason.message.includes('S3'))) {
      console.error('Unhandled upload-related error:', event.reason);
    }
  });
});

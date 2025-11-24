# Configure AWS SDK with SSL certificate fix
if defined?(Aws)
  Aws.config.update({
    region: ENV.fetch('AWS_REGION') { 'eu-west-2' },
    # Fix SSL certificate verification issues
    ssl_verify_peer: false,
    ssl_ca_bundle: nil,
    ssl_ca_directory: nil,
    ssl_ca_store: nil
  })
end

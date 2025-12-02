import { ValidationError } from 'joi';

/**
 * Formats Joi validation errors into user-friendly messages
 */
export const formatValidationError = (error: ValidationError): string => {
  const details = error.details[0];
  
  // Handle different error types
  switch (details.type) {
    case 'any.required':
      return `${details.path.join('.')} is required`;
    
    case 'string.email':
      return 'Please provide a valid email address';
    
    case 'string.min':
      return `${details.path.join('.')} must be at least ${details.context?.limit} characters long`;
    
    case 'string.max':
      return `${details.path.join('.')} must not exceed ${details.context?.limit} characters`;
    
    case 'string.length':
      return `${details.path.join('.')} must be exactly ${details.context?.limit} characters long`;
    
    case 'string.pattern.base':
      if (details.path[0] === 'phoneNumber') {
        return 'Please provide a valid phone number (e.g., +2348012345678)';
      }
      return `${details.path.join('.')} format is invalid`;
    
    case 'any.only':
      if (details.path[0] === 'confirmPassword' || details.path[0] === 'confirmPin' || details.path[0] === 'confirmPassword') {
        return 'Passwords do not match';
      }
      if (details.path[0] === 'confirmPin') {
        return 'PINs do not match';
      }
      return `${details.path.join('.')} must match the required value`;
    
    case 'any.allowOnly':
      return `${details.path.join('.')} must be one of: ${details.context?.valids?.join(', ')}`;
    
    case 'any.invalid':
      return `${details.path.join('.')} is invalid`;
    
    default:
      // Fallback: clean up the default Joi message
      let message = details.message;
      // Remove quotes around field names
      message = message.replace(/"/g, '');
      // Replace [ref:password] with "password"
      message = message.replace(/\[ref:(\w+)\]/g, (match, field) => field);
      // Capitalize first letter
      message = message.charAt(0).toUpperCase() + message.slice(1);
      return message;
  }
};

/**
 * Gets the first validation error message in a user-friendly format
 */
export const getValidationErrorMessage = (error: ValidationError | undefined): string | null => {
  if (!error) return null;
  return formatValidationError(error);
};


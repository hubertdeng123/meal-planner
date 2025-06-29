"""Custom exceptions for better error handling"""


class EmailServiceError(Exception):
    """Base exception for email service errors"""

    pass


class SMTPConfigurationError(EmailServiceError):
    """Raised when SMTP configuration is invalid or missing"""

    def __init__(
        self,
        message: str = "Email service is not properly configured. Please contact support.",
    ):
        self.message = message
        super().__init__(self.message)


class SMTPConnectionError(EmailServiceError):
    """Raised when connection to SMTP server fails"""

    def __init__(
        self,
        message: str = "Unable to connect to email server. Please try again later.",
    ):
        self.message = message
        super().__init__(self.message)


class SMTPAuthenticationError(EmailServiceError):
    """Raised when SMTP authentication fails"""

    def __init__(
        self,
        message: str = "Email server authentication failed. Please contact support.",
    ):
        self.message = message
        super().__init__(self.message)


class EmailDeliveryError(EmailServiceError):
    """Raised when email cannot be delivered"""

    def __init__(
        self,
        message: str = "Email could not be delivered. Please check your email address.",
    ):
        self.message = message
        super().__init__(self.message)


class EmailTemplateError(EmailServiceError):
    """Raised when email template rendering fails"""

    def __init__(
        self, message: str = "Error generating email content. Please contact support."
    ):
        self.message = message
        super().__init__(self.message)

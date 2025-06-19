from app import db
from datetime import datetime

class SignedFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(64), nullable=False)  # SHA-256 hash
    signature = db.Column(db.Text, nullable=False)  # Base64 encoded signature
    public_key = db.Column(db.Text, nullable=False)  # PEM format public key
    private_key = db.Column(db.Text, nullable=False)  # PEM format private key
    certificate_info = db.Column(db.Text)  # JSON string with certificate details
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_size = db.Column(db.Integer)
    is_verified = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<SignedFile {self.original_filename}>'

class VerificationLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    signed_file_id = db.Column(db.Integer, db.ForeignKey('signed_file.id'), nullable=False)
    verification_result = db.Column(db.Boolean, nullable=False)
    verification_details = db.Column(db.Text)
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    signed_file = db.relationship('SignedFile', backref=db.backref('verifications', lazy=True))

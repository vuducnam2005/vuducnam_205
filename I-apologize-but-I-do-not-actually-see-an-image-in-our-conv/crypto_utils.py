import hashlib
import base64
import json
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, PublicFormat, NoEncryption
from cryptography import x509
from cryptography.x509.oid import NameOID
import os

class DigitalSignatureManager:
    def __init__(self):
        self.key_size = 2048
        
    def generate_key_pair(self):
        """Generate RSA key pair"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size,
        )
        public_key = private_key.public_key()
        
        # Serialize keys to PEM format
        private_pem = private_key.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption()
        )
        
        public_pem = public_key.public_bytes(
            encoding=Encoding.PEM,
            format=PublicFormat.SubjectPublicKeyInfo
        )
        
        return private_pem.decode('utf-8'), public_pem.decode('utf-8')
    
    def calculate_file_hash(self, file_path):
        """Calculate SHA-256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def sign_data(self, data_hash, private_key_pem):
        """Sign data hash using private key"""
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None,
        )
        
        # Sign the hash
        signature = private_key.sign(
            data_hash.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return base64.b64encode(signature).decode('utf-8')
    
    def verify_signature(self, data_hash, signature_b64, public_key_pem):
        """Verify signature using public key"""
        try:
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8')
            )
            
            signature = base64.b64decode(signature_b64.encode('utf-8'))
            
            public_key.verify(
                signature,
                data_hash.encode('utf-8'),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            print(f"Verification failed: {e}")
            return False
    
    def create_certificate_info(self, public_key_pem, subject_name="Digital Signature Certificate"):
        """Create certificate information"""
        certificate_info = {
            "subject": subject_name,
            "issuer": "Self-Signed Certificate Authority",
            "serial_number": str(hash(public_key_pem) % (10**10)),
            "not_valid_before": datetime.utcnow().isoformat(),
            "not_valid_after": (datetime.utcnow() + timedelta(days=365)).isoformat(),
            "algorithm": "RSA-2048",
            "hash_algorithm": "SHA-256",
            "key_usage": ["digital_signature", "key_encipherment"],
            "created_at": datetime.utcnow().isoformat()
        }
        return json.dumps(certificate_info, indent=2)
    
    def get_key_fingerprint(self, public_key_pem):
        """Get public key fingerprint"""
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        
        public_bytes = public_key.public_bytes(
            encoding=Encoding.DER,
            format=PublicFormat.SubjectPublicKeyInfo
        )
        
        fingerprint = hashlib.sha256(public_bytes).hexdigest()
        return ':'.join(fingerprint[i:i+2] for i in range(0, len(fingerprint), 2))

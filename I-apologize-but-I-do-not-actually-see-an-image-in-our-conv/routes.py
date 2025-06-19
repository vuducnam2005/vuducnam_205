import os
import json
from flask import render_template, request, flash, redirect, url_for, jsonify, send_file
from werkzeug.utils import secure_filename
from app import app, db
from models import SignedFile, VerificationLog
from crypto_utils import DigitalSignatureManager
import uuid

dsm = DigitalSignatureManager()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file selected'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Generate unique filename
            filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Calculate file hash
            file_hash = dsm.calculate_file_hash(file_path)
            
            # Generate key pair
            private_key, public_key = dsm.generate_key_pair()
            
            # Sign the file hash
            signature = dsm.sign_data(file_hash, private_key)
            
            # Create certificate info
            certificate_info = dsm.create_certificate_info(public_key, f"Certificate for {file.filename}")
            
            # Save to database
            signed_file = SignedFile(
                filename=filename,
                original_filename=file.filename,
                file_hash=file_hash,
                signature=signature,
                public_key=public_key,
                private_key=private_key,
                certificate_info=certificate_info,
                file_size=os.path.getsize(file_path)
            )
            
            db.session.add(signed_file)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'file_id': signed_file.id,
                'filename': file.filename,
                'file_hash': file_hash,
                'signature': signature,
                'certificate': json.loads(certificate_info),
                'public_key_fingerprint': dsm.get_key_fingerprint(public_key)
            })
            
        except Exception as e:
            app.logger.error(f"Error processing file: {e}")
            return jsonify({'error': 'Failed to process file'}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/verify/<int:file_id>')
def verify_file(file_id):
    signed_file = SignedFile.query.get_or_404(file_id)
    
    try:
        # Get file path
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], signed_file.filename)
        
        # Recalculate file hash
        current_hash = dsm.calculate_file_hash(file_path)
        
        # Check if file has been tampered with
        file_integrity = current_hash == signed_file.file_hash
        
        # Verify signature
        signature_valid = dsm.verify_signature(
            signed_file.file_hash, 
            signed_file.signature, 
            signed_file.public_key
        )
        
        verification_result = file_integrity and signature_valid
        
        # Log verification
        verification_log = VerificationLog(
            signed_file_id=file_id,
            verification_result=verification_result,
            verification_details=json.dumps({
                'file_integrity': file_integrity,
                'signature_valid': signature_valid,
                'original_hash': signed_file.file_hash,
                'current_hash': current_hash
            })
        )
        
        db.session.add(verification_log)
        signed_file.is_verified = verification_result
        db.session.commit()
        
        return jsonify({
            'success': True,
            'verification_result': verification_result,
            'file_integrity': file_integrity,
            'signature_valid': signature_valid,
            'original_hash': signed_file.file_hash,
            'current_hash': current_hash,
            'certificate': json.loads(signed_file.certificate_info),
            'public_key_fingerprint': dsm.get_key_fingerprint(signed_file.public_key)
        })
        
    except Exception as e:
        app.logger.error(f"Error verifying file: {e}")
        return jsonify({'error': 'Failed to verify file'}), 500

@app.route('/download/<int:file_id>')
def download_file(file_id):
    signed_file = SignedFile.query.get_or_404(file_id)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], signed_file.filename)
    
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=signed_file.original_filename)
    else:
        flash('File not found', 'error')
        return redirect(url_for('index'))

@app.route('/files')
def list_files():
    files = SignedFile.query.order_by(SignedFile.created_at.desc()).all()
    files_data = []
    
    for file in files:
        files_data.append({
            'id': file.id,
            'filename': file.original_filename,
            'file_hash': file.file_hash,
            'created_at': file.created_at.isoformat(),
            'file_size': file.file_size,
            'is_verified': file.is_verified,
            'certificate': json.loads(file.certificate_info),
            'public_key_fingerprint': dsm.get_key_fingerprint(file.public_key)
        })
    
    return jsonify(files_data)

@app.route('/certificate/<int:file_id>')
def get_certificate(file_id):
    signed_file = SignedFile.query.get_or_404(file_id)
    return jsonify({
        'certificate': json.loads(signed_file.certificate_info),
        'public_key': signed_file.public_key,
        'public_key_fingerprint': dsm.get_key_fingerprint(signed_file.public_key),
        'signature': signed_file.signature
    })

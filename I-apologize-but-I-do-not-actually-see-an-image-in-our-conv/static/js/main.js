// Global variables
let selectedFile = null;
let uploadedFiles = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
    loadFiles();
});

// Initialize upload functionality
function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Handle file processing
function handleFile(file) {
    selectedFile = file;
    showUploadProgress();
    uploadFile(file);
}

function showUploadProgress() {
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    
    uploadArea.classList.add('d-none');
    uploadProgress.classList.remove('d-none');
    
    // Simulate progress
    let progress = 0;
    const progressBar = uploadProgress.querySelector('.progress-bar');
    const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 90) {
            progress = 90;
        }
        progressBar.style.width = progress + '%';
        
        if (progress >= 90) {
            clearInterval(interval);
        }
    }, 200);
}

function hideUploadProgress() {
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');
    
    uploadProgress.classList.add('d-none');
    uploadArea.classList.remove('d-none');
    progressBar.style.width = '0%';
}

// Upload file to server
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        hideUploadProgress();
        
        if (result.success) {
            showSigningResult(result);
            loadFiles(); // Refresh file list
        } else {
            showError(result.error || 'Có lỗi xảy ra khi xử lý file');
        }
    } catch (error) {
        hideUploadProgress();
        showError('Không thể kết nối đến server');
        console.error('Upload error:', error);
    }
}

// Show signing result
function showSigningResult(result) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="result-card result-success">
            <div class="d-flex align-items-center mb-3">
                <i data-feather="check-circle" class="text-success me-2" style="width: 24px; height: 24px;"></i>
                <h5 class="mb-0">Ký Thành Công!</h5>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <h6><i data-feather="file-text" class="me-1"></i> Thông Tin File</h6>
                    <p><strong>Tên file:</strong> ${result.filename}</p>
                    <p><strong>Hash (SHA-256):</strong> <code class="small">${result.file_hash}</code></p>
                </div>
                <div class="col-md-6">
                    <h6><i data-feather="shield" class="me-1"></i> Chữ Ký Số</h6>
                    <p><strong>Thuật toán:</strong> RSA-2048</p>
                    <p><strong>Fingerprint:</strong> <code class="small">${result.public_key_fingerprint}</code></p>
                </div>
            </div>
            <div class="mt-3">
                <h6><i data-feather="award" class="me-1"></i> Chứng Chỉ</h6>
                <div class="cert-info">
                    <div class="cert-field">
                        <span class="cert-label">Chủ sở hữu:</span>
                        <span class="cert-value">${result.certificate.subject}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Cơ quan cấp:</span>
                        <span class="cert-value">${result.certificate.issuer}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Có hiệu lực từ:</span>
                        <span class="cert-value">${new Date(result.certificate.not_valid_before).toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Hết hạn:</span>
                        <span class="cert-value">${new Date(result.certificate.not_valid_after).toLocaleString('vi-VN')}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
    
    // Replace feather icons
    feather.replace();
}

// Load files list
async function loadFiles() {
    try {
        const response = await fetch('/files');
        const files = await response.json();
        
        displayFiles(files);
    } catch (error) {
        console.error('Error loading files:', error);
        showError('Không thể tải danh sách file');
    }
}

// Display files in the list
function displayFiles(files) {
    const filesList = document.getElementById('filesList');
    
    if (files.length === 0) {
        filesList.innerHTML = `
            <div class="text-center py-4">
                <i data-feather="folder" class="text-muted mb-3" style="width: 48px; height: 48px;"></i>
                <p class="text-muted">Chưa có file nào được ký</p>
                <button class="btn btn-outline-secondary" onclick="loadFiles()">
                    <i data-feather="refresh-cw" class="me-1"></i>
                    Tải lại
                </button>
            </div>
        `;
    } else {
        filesList.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div>
                        <h6 class="file-name">
                            <i data-feather="file-text" class="me-1"></i>
                            ${file.filename}
                        </h6>
                        <small class="file-date">
                            <i data-feather="clock" class="me-1"></i>
                            ${new Date(file.created_at).toLocaleString('vi-VN')}
                        </small>
                    </div>
                    <div>
                        ${file.is_verified ? 
                            '<span class="status-verified"><i data-feather="shield-check" style="width: 14px; height: 14px;"></i> Đã xác thực</span>' : 
                            '<span class="status-pending"><i data-feather="clock" style="width: 14px; height: 14px;"></i> Chưa xác thực</span>'
                        }
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-verify" onclick="verifyFile(${file.id})">
                        <i data-feather="search" class="me-1"></i>
                        Xác thực
                    </button>
                    <button class="btn btn-sm btn-download" onclick="downloadFile(${file.id})">
                        <i data-feather="download" class="me-1"></i>
                        Tải về
                    </button>
                    <button class="btn btn-sm btn-certificate" onclick="viewCertificate(${file.id})">
                        <i data-feather="award" class="me-1"></i>
                        Chứng chỉ
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Replace feather icons
    feather.replace();
}

// Verify file
async function verifyFile(fileId) {
    try {
        showLoadingModal('Đang xác thực chữ ký...');
        
        const response = await fetch(`/verify/${fileId}`);
        const result = await response.json();
        
        hideLoadingModal();
        
        if (result.success) {
            showVerificationResult(result);
            loadFiles(); // Refresh file list
        } else {
            showError(result.error || 'Có lỗi xảy ra khi xác thực');
        }
    } catch (error) {
        hideLoadingModal();
        showError('Không thể kết nối đến server');
        console.error('Verification error:', error);
    }
}

// Show verification result
function showVerificationResult(result) {
    const modalBody = document.getElementById('modalBody');
    const isValid = result.verification_result;
    const cardClass = isValid ? 'result-success' : 'result-error';
    const icon = isValid ? 'check-circle' : 'x-circle';
    const iconColor = isValid ? 'text-success' : 'text-danger';
    const title = isValid ? 'Xác Thực Thành Công!' : 'Xác Thực Thất Bại!';
    
    modalBody.innerHTML = `
        <div class="result-card ${cardClass}">
            <div class="d-flex align-items-center mb-3">
                <i data-feather="${icon}" class="${iconColor} me-2" style="width: 24px; height: 24px;"></i>
                <h5 class="mb-0">${title}</h5>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6><i data-feather="shield" class="me-1"></i> Tính Toàn Vẹn File</h6>
                    <p class="${result.file_integrity ? 'text-success' : 'text-danger'}">
                        <i data-feather="${result.file_integrity ? 'check' : 'x'}" class="me-1"></i>
                        ${result.file_integrity ? 'File nguyên vẹn' : 'File đã bị thay đổi'}
                    </p>
                </div>
                <div class="col-md-6">
                    <h6><i data-feather="key" class="me-1"></i> Chữ Ký Hợp Lệ</h6>
                    <p class="${result.signature_valid ? 'text-success' : 'text-danger'}">
                        <i data-feather="${result.signature_valid ? 'check' : 'x'}" class="me-1"></i>
                        ${result.signature_valid ? 'Chữ ký hợp lệ' : 'Chữ ký không hợp lệ'}
                    </p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <h6><i data-feather="hash" class="me-1"></i> So Sánh Hash</h6>
                    <div class="mb-2">
                        <small class="text-muted">Hash gốc:</small>
                        <br><code class="small">${result.original_hash}</code>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">Hash hiện tại:</small>
                        <br><code class="small">${result.current_hash}</code>
                    </div>
                    <p class="${result.original_hash === result.current_hash ? 'text-success' : 'text-danger'}">
                        <i data-feather="${result.original_hash === result.current_hash ? 'check' : 'x'}" class="me-1"></i>
                        ${result.original_hash === result.current_hash ? 'Hash khớp' : 'Hash không khớp'}
                    </p>
                </div>
            </div>
            
            ${result.certificate ? `
            <div class="mt-3">
                <h6><i data-feather="award" class="me-1"></i> Thông Tin Chứng Chỉ</h6>
                <div class="cert-info">
                    <div class="cert-field">
                        <span class="cert-label">Chủ sở hữu:</span>
                        <span class="cert-value">${result.certificate.subject}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Fingerprint:</span>
                        <span class="cert-value">${result.public_key_fingerprint}</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
    
    // Replace feather icons
    feather.replace();
}

// Download file
function downloadFile(fileId) {
    window.location.href = `/download/${fileId}`;
}

// View certificate
async function viewCertificate(fileId) {
    try {
        const response = await fetch(`/certificate/${fileId}`);
        const result = await response.json();
        
        showCertificateModal(result);
    } catch (error) {
        showError('Không thể tải thông tin chứng chỉ');
        console.error('Certificate error:', error);
    }
}

// Show certificate modal
function showCertificateModal(certData) {
    const certificateBody = document.getElementById('certificateBody');
    const cert = certData.certificate;
    
    certificateBody.innerHTML = `
        <div class="row">
            <div class="col-lg-6">
                <div class="cert-info mb-4">
                    <h6 class="mb-3">
                        <i data-feather="info" class="me-1"></i>
                        Thông Tin Chung
                    </h6>
                    <div class="cert-field">
                        <span class="cert-label">Chủ sở hữu:</span>
                        <span class="cert-value">${cert.subject}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Cơ quan cấp:</span>
                        <span class="cert-value">${cert.issuer}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Số serial:</span>
                        <span class="cert-value">${cert.serial_number}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Thuật toán:</span>
                        <span class="cert-value">${cert.algorithm}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Hash algorithm:</span>
                        <span class="cert-value">${cert.hash_algorithm}</span>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="cert-info mb-4">
                    <h6 class="mb-3">
                        <i data-feather="calendar" class="me-1"></i>
                        Thời Gian Hiệu Lực
                    </h6>
                    <div class="cert-field">
                        <span class="cert-label">Có hiệu lực từ:</span>
                        <span class="cert-value">${new Date(cert.not_valid_before).toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Hết hạn:</span>
                        <span class="cert-value">${new Date(cert.not_valid_after).toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Ngày tạo:</span>
                        <span class="cert-value">${new Date(cert.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                </div>
                
                <div class="cert-info">
                    <h6 class="mb-3">
                        <i data-feather="key" class="me-1"></i>
                        Thông Tin Khóa
                    </h6>
                    <div class="cert-field">
                        <span class="cert-label">Fingerprint:</span>
                        <span class="cert-value small">${certData.public_key_fingerprint}</span>
                    </div>
                    <div class="cert-field">
                        <span class="cert-label">Mục đích sử dụng:</span>
                        <span class="cert-value">${cert.key_usage.join(', ')}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-4">
            <h6 class="mb-3">
                <i data-feather="code" class="me-1"></i>
                Public Key (PEM)
            </h6>
            <div class="bg-light p-3 rounded">
                <code class="small d-block" style="white-space: pre-wrap; word-break: break-all;">${certData.public_key}</code>
            </div>
        </div>
        
        <div class="mt-4">
            <h6 class="mb-3">
                <i data-feather="edit-3" class="me-1"></i>
                Chữ Ký Digital (Base64)
            </h6>
            <div class="bg-light p-3 rounded">
                <code class="small d-block" style="white-space: pre-wrap; word-break: break-all;">${certData.signature}</code>
            </div>
        </div>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('certificateModal'));
    modal.show();
    
    // Replace feather icons
    feather.replace();
}

// Show loading modal
function showLoadingModal(message) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="loading-spinner mb-3"></div>
            <p class="text-muted">${message}</p>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
}

// Hide loading modal
function hideLoadingModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('resultModal'));
    if (modal) {
        modal.hide();
    }
}

// Show error message
function showError(message) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="result-card result-error">
            <div class="d-flex align-items-center mb-3">
                <i data-feather="alert-circle" class="text-danger me-2" style="width: 24px; height: 24px;"></i>
                <h5 class="mb-0">Có Lỗi Xảy Ra</h5>
            </div>
            <p class="text-danger">${message}</p>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
    
    // Replace feather icons
    feather.replace();
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatHash(hash) {
    return hash.match(/.{1,8}/g).join(' ');
}

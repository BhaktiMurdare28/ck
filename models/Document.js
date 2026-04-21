const mongoose = require('mongoose');

const DocumentVersionSchema = new mongoose.Schema({
  versionNo: { type: Number, default: 1 },
  uploadedDate: { type: Date, default: Date.now },
  uploadedBy: { type: String },
  fileName: { type: String },
  filePath: { type: String },
  remark: { type: String }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  // Core identifiers
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String },
  
  // Document classification
  docType: { 
    type: String, 
    enum: [
      // Pre-Construction & Approvals
      'sanction-plan', 'na-order', 'environmental-noc', 'forest-noc', 'railway-noc', 
      'rera-registration', 'fire-noc-approval', 'water-noc', 'pollution-noc',
      // Execution & Contractor
      'boq', 'gfc-drawings', 'tender-document', 'work-order', 'contractor-agreement',
      'insurance-certificate', 'material-cert', 'labour-bill', 'purchase-invoice',
      // Post-Construction & Handover
      'completion-certificate', 'occupancy-cert', 'fire-noc-handover', 'utility-noc-final',
      'defect-liability-cert', 'possession-letter', 'warranty-doc', 'as-built-drawings'
    ],
    required: true 
  },
  category: { 
    type: String, 
    enum: ['pre-construction', 'execution', 'post-construction'],
    required: true 
  },
  name: { type: String, required: true },
  description: { type: String },
  
  // Status workflow
  status: { 
    type: String, 
    enum: ['missing', 'uploaded', 'under-review', 'approved', 'rejected', 'expired'],
    default: 'missing'
  },
  
  // Upload tracking
  uploadPath: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  uploadedBy: { type: String },
  uploadedDate: { type: Date },
  
  // Approval workflow
  approvalRemarks: { type: String },
  rejectionReason: { type: String },
  approvedBy: { type: String },
  approvalDate: { type: Date },
  
  // Generation tracking
  generatedFrom: { type: String }, // e.g., 'template-boq', 'template-work-order'
  generatedDate: { type: Date },
  generationData: { type: mongoose.Schema.Types.Mixed }, // Stores generation parameters
  
  // Expiry management
  expiryDate: { type: Date },
  isExpiring: { type: Boolean, default: false },
  daysToExpiry: { type: Number },
  
  // Version history
  versions: [DocumentVersionSchema],
  
  // Metadata
  mandatory: { type: Boolean, default: true },
  linkedStages: [{ type: String }], // e.g., ['foundation', 'structure']
  tags: [{ type: String }],
  
}, { timestamps: true });

// Pre-save middleware to track versions
DocumentSchema.pre('save', function(next) {
  if (this.isModified('uploadPath')) {
    const version = new DocumentVersionSchema({
      versionNo: this.versions.length + 1,
      uploadedBy: this.uploadedBy,
      fileName: this.fileName,
      filePath: this.uploadPath
    });
    if (!this.versions) this.versions = [];
    this.versions.push(version);
  }
  
  // Calculate days to expiry
  if (this.expiryDate) {
    const daysLeft = Math.ceil((this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    this.daysToExpiry = daysLeft;
    this.isExpiring = daysLeft <= 30 && daysLeft > 0;
  }
  
  next();
});

// Index for efficient queries
DocumentSchema.index({ projectId: 1, status: 1 });
DocumentSchema.index({ projectId: 1, docType: 1 });
DocumentSchema.index({ projectId: 1, category: 1 });

module.exports = mongoose.model('Document', DocumentSchema);

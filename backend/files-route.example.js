// مثال لمسار رفع الملفات المطلوب في خادم النوادي (mihrab-clubs-backend) — يُضاف إلى الخادم لا إلى التطبيق.
// npm i multer @aws-sdk/client-s3   (أو أي تخزين: Cloudflare R2 / S3 / Cloudinary)
// ملاحظة: قرص Render مؤقت، فلا تخزّن على القرص المحلي في الإنتاج.
const multer = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const MAX = 100 * 1024 * 1024; // 100MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX } });
// للملفات الكبيرة الأفضل البث المباشر (multer-s3 أو presigned URL) بدل الذاكرة.

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_KEY, secretAccessKey: process.env.S3_SECRET },
});

module.exports = (router, requireAuth, requireMember) => {
  // requireMember: يتحقق أن المستخدم عضو نشط في المجموعة :id
  router.post('/groups/:id/files', requireAuth, requireMember, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'NO_FILE' });
      const safe = req.file.originalname.replace(/[^\w.\-؀-ۿ]/g, '_');
      const key = `clubs/${req.params.id}/${crypto.randomUUID()}-${safe}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype,
      }));
      res.json({ url: `${process.env.S3_PUBLIC_URL}/${key}`, fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
    } catch (e) {
      res.status(500).json({ error: 'UPLOAD_FAILED' });
    }
  });
};
// وتأكد من: CORS يسمح بأصل التطبيق، وحدّ جسم الطلب في الوسيط/البروكسي ≥ 100MB، والتحقق من نوع الملف عند الحاجة.

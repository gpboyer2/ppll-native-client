const httpStatus = require('http-status');
const catchAsync = require('../utils/catch-async');
const { sendSuccess, sendError } = require('../utils/api-response');
const twitterService = require('../service/twitter.service.js');

const downloadMedia = catchAsync(async (req, res) => {
  const { downloadUrl, fileName } = req.query;

  if (!downloadUrl || !fileName) {
    return sendError(res, 'downloadUrl and fileName are required', 400);
  }

  // 基础的文件名清理，防止路径遍历攻击
  const sanitized_file_name = fileName.replace(/\.\.\//g, '').replace(/\//g, '');

  try {
    const result = await twitterService.downloadMedia(downloadUrl, sanitized_file_name);

    if (result.status === 'exists') {
      return sendSuccess(res, { path: result.path }, 'File with the same name already exists. Download skipped.');
    }

    // Presuming the other status is 'downloaded'
    return sendSuccess(res, { path: result.path }, 'File downloaded successfully');

  } catch (err) {
    return sendError(res, err.message || 'Failed to download file', 500);
  }
});

module.exports = {
  downloadMedia,
};

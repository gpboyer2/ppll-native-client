const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const twitterService = require('../service/twitter.service.js');

const downloadMedia = catchAsync(async (req, res) => {
  const { downloadUrl, fileName } = req.query;

  if (!downloadUrl || !fileName) {
    return res.status(httpStatus.BAD_REQUEST).send({ error: 'downloadUrl and fileName are required' });
  }

  // 基础的文件名清理，防止路径遍历攻击
  const sanitizedFileName = fileName.replace(/\.\.\//g, '').replace(/\//g, '');

  try {
    const result = await twitterService.downloadMedia(downloadUrl, sanitizedFileName);

    if (result.status === 'exists') {
      return res.status(httpStatus.OK).send({
        message: 'File with the same name already exists. Download skipped.',
        path: result.path
      });
    }

    // Presuming the other status is 'downloaded'
    res.status(httpStatus.OK).send({
      message: 'File downloaded successfully',
      path: result.path
    });

  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'Failed to download file',
      details: error.message
    });
  }
});

module.exports = {
  downloadMedia,
};

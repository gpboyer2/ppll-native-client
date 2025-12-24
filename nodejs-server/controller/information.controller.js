
const template = (req, res) => {
    res.send({
        status: 'success',
        code: 200,
        data: {
            message: 'You are here now...'
        }
    })
}


module.exports = {
    template
}

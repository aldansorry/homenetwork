exports.success = (res, data, message = "OK") => {
    return res.status(200).json({
        status: "success",
        message,
        data
    });
};

exports.failed = (res, message = "Error", code = 400) => {
    return res.status(code).json({
        status: "failed",
        message
    });
};

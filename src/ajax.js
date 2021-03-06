// 使用xhr和promise实现的ajax，和jQuery的ajax不一样，它是返回promise实例，但比fetch api多了pending状态监听
let ajaxDefaults = {
    url: "",
    type: "GET",
    data: "",
    crossDomain: FALSE,
    dataType: "",
    headers: {},
    timeout: 100000,
    username: null,
    password: null,
    contentType: "json"
};

const ajax = (options) => {
    let defaults = assign({}, ajaxDefaults);
    assign(defaults, options);

    // 转大写
    defaults.type = defaults.type.toUpperCase();

    let {
        url,
        contentType,
        data
    } = defaults;

    // 修正form数据类型
    if (data instanceof FormData) {
        contentType = "form";
    } else if (contentType.indexOf('form') > -1) {
        // 转换 object to Formdata
        let fdata = new FormData();
        for (let name in data) {
            fdata.append(name, data[name]);
        }
        data = fdata;
    }

    switch (defaults.type) {
        case "GET":
            // get是没有的
            contentType = "";
            // 转换数据
            let dataUrlencode = objectToUrlencode(data);
            url += (url.indexOf("?") > -1 ? url += "&" : "?") + dataUrlencode;
            data = null;
            break;
        case "POST":
            let charsetutf8 = '; charset=UTF-8';
            // 修正contentType
            // application/json; multipart/form-data; application/x-www-form-urlencoded; text/xml;
            if (contentType.indexOf('json') > -1) {
                contentType = "application/json" + charsetutf8;
                data = JSON.stringify(data);
            } else if (contentType.indexOf('urlencoded') > -1) {
                contentType = "application/x-www-form-urlencoded" + charsetutf8;
                data = objectToUrlencode(data);
            } else if (contentType.indexOf('form') > -1) {
                contentType = "multipart/form-data" + charsetutf8;
            } else if (contentType.indexOf('xml') > -1) {
                contentType = "text/xml" + charsetutf8;
            }
            break;
    }

    // 事件寄存对象
    let eveObj = $({});

    // 实例
    var oReq = new XMLHttpRequest();
    // 要返回回去的promise
    let reP = new Promise((res, rej) => {
        // 设置请求
        oReq.open(defaults.type, url, TRUE, defaults.username, defaults.password);

        // 设置 header
        let {
            headers
        } = defaults;
        for (let k in headers) {
            oReq.setRequestHeader(k, headers[k]);
        }

        // 设置contentType
        contentType && oReq.setRequestHeader("Content-Type", contentType);

        // 设置返回数据类型
        oReq.responseType = defaults.dataType;

        // 跨域是否带上cookie
        oReq.withCredentials = defaults.crossDomain;

        // 超时时间设定
        oReq.timeout = defaults.timeout;

        // 设置callback
        oReq.addEventListener('load', e => {
            let {
                target
            } = e;

            let {
                response
            } = e.target;

            // 修正返回数据类型
            let responseContentType = target.getResponseHeader('content-type');
            if (responseContentType && responseContentType.indexOf("application/json") > -1 && typeof response != "object") {
                response = JSON.parse(response);
            }
            res(response);
        }, FALSE);
        oReq.addEventListener('error', e => {
            rej();
        }, FALSE);
        oReq.addEventListener("progress", e => {
            eveObj.trigger('loading', e);
        }, FALSE);
        oReq.upload && oReq.upload.addEventListener("progress", e => {
            eveObj.trigger('uploading', e);
        }, FALSE);
    });

    assign(reP, {
        // 加载中
        loading(func) {
            eveObj.on('loading', (e, data) => func(data));
            return reP;
        },
        // 上传中
        uploading(func) {
            eveObj.on('uploading', (e, data) => func(data));
            return reP;
        },
        // 发送前
        beforeSend(func) {
            // 直接进去函数
            func(oReq);
            return reP;
        }
    });

    // 异步发送请求
    setTimeout(() => {
        data ? oReq.send(data) : oReq.send();
    }, 0);

    // 返回参数
    reP.options = defaults;

    return reP;
}

// 转换成urlencode
const objectToUrlencode = (obj, headerStr = "", isParam) => {
    let str = "";
    for (let k in obj) {
        let val = obj[k];
        if (typeof val === "object") {
            if (headerStr) {
                str += objectToUrlencode(val, `${headerStr}[${k}]`, isParam);
            } else {
                str += objectToUrlencode(val, k, isParam);
            }
        } else {
            if (headerStr) {
                if (obj instanceof Array) {
                    k = "";
                }
                k = headerStr + `[${k}]`;
            }
            if (!isParam) {
                k = encodeURIComponent(k);
                val = encodeURIComponent(val);
            }
            str += `${k}=${val}&`;
        }
    }

    if (!headerStr) {
        // 去掉最后的 &
        str = str.replace(/&$/g, "");
    }
    return str;
}

const ajaxSetup = (options) => {
    assign(ajaxDefaults, options);
}

assign($, {
    ajax,
    ajaxSetup,
    param(obj) {
        return objectToUrlencode(obj, "", 1)
    }
});

each(['get', 'post'], name => {
    $[name] = (url, data, dataType) => {
        let options = {
            url,
            type: name.toUpperCase(),
            data
        }
        dataType && (options.dataType = dataType);
        return ajax(options);
    }
});
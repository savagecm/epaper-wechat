// pages/funtionPage/funtionPage.js
var app = getApp();
var utils = require("../../utils/util.js");

function px(x, y) {
    return x * 4 + y * 640 * 4;
}

Page({

    /**
     * 页面的初始数据
     */
    data: {
        textLog: "",
        deviceId: "",
        name: "",
        allRes: "",
        serviceId: "",
        readCharacteristicId: "",
        writeCharacteristicId: "",
        notifyCharacteristicId: "",
        connected: true,
        canWrite: false,
        imagesList: [],
        monoimagedata: [],

    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        var that = this;
        var devid = decodeURIComponent(options.deviceId);
        var devname = decodeURIComponent(options.name);
        var devserviceid = decodeURIComponent(options.serviceId);
        var log = that.data.textLog + "设备名=" + devname + "\n设备UUID=" + devid + "\n服务UUID=" + devserviceid + "\n";
        this.setData({
            textLog: log,
            deviceId: devid,
            name: devname,
            serviceId: devserviceid
        });
        //获取特征值
        that.getBLEDeviceCharacteristics();
    },

    chooseImage: function () {
        var that = this
        wx.chooseImage({
            count: 1, // 默认9
            sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
            sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
            success: function (res) {
                console.log(res)
                // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
                var tempFilePaths = res.tempFilePaths
                that.setData({
                    imagesList: tempFilePaths,
                    monoimagedata: []
                })

                console.log(tempFilePaths[0])

                const canvasctx = wx.createCanvasContext('canvassrc');


                canvasctx.drawImage(tempFilePaths[0], 0, 0, 640, 384);
                canvasctx.draw(false,
                    () => {
                        wx.canvasGetImageData({
                            canvasId: 'canvassrc',
                            x: 0,
                            y: 0,
                            width: 640,
                            height: 384,
                            success(res) {
                                console.log(res.width) // 100
                                console.log(res.height) // 100
                                console.log(res.data instanceof Uint8ClampedArray) // true
                                console.log(res.data.length) // 100 * 100 * 4
                                const dstData = new Uint8ClampedArray(res.data);
                                // 8bit 8 pix
                                //const epaperData = new Array(res.data.length / 8);
                                var epaperDataArray = new Uint8Array(640 * 384 / 8);
                                var epaperData = epaperDataArray;
                                for (let y = 0; y < res.height; y++) {
                                    for (let x = 0; x < res.width; x++) {
                                        let oldPixel = dstData[px(x, y)];
                                        let newPixel = oldPixel > 125 ? 255 : 0;

                                        // set epaper bit info
                                        let position = (y * res.width + x) / 8;
                                        if (newPixel < 125) { epaperData[position] = epaperData[position] | (0x01 << ((y * res.width + x) % 8)) }
                                        else {
                                            epaperData[position] = epaperData[position] & (~(0x01 << ((y * res.width + x) % 8)))
                                        }

                                        // preview picture
                                        dstData[px(x, y)] = dstData[px(x, y) + 1] = dstData[px(x, y) + 2] = newPixel;
                                        let quantError = oldPixel - newPixel;
                                        dstData[px(x + 1, y)] = dstData[px(x + 1, y) + 1] = dstData[px(x + 1, y) + 2] = dstData[px(x + 1, y)] + (quantError * 7) / 16;
                                        dstData[px(x - 1, y + 1)] = dstData[px(x - 1, y + 1) + 1] = dstData[px(x - 1, y + 1) + 2] = dstData[px(x - 1, y + 1)] + (quantError * 3) / 16;
                                        dstData[px(x, y + 1)] = dstData[px(x, y + 1) + 1] = dstData[px(x, y + 1) + 2] = dstData[px(x, y + 1)] + (quantError * 5) / 16;
                                        dstData[px(x + 1, y + 1)] = dstData[px(x + 1, y + 1) + 1] = dstData[px(x + 1, y + 1) + 2] = dstData[px(x + 1, y + 1)] + (quantError * 1) / 16;
                                    }
                                }

                                console.log("now set epaper data")
                                that.setData({
                                    monoimagedata: epaperData
                                })


                                console.log("now start to put image")
                                wx.canvasPutImageData({
                                    canvasId: 'canvasdst',
                                    x: 0,
                                    y: 0,
                                    width: 640,
                                    height: 384,
                                    data: dstData,
                                    success(res) {
                                        console.log("put image data success!");
                                    },
                                    fail() {
                                        console.log("put image data fail!")
                                    }
                                })
                            }
                        })
                    });
            }
        })
    },

    previewImage: function (e) {
        var current = e.target.dataset.src;
        wx.previewImage({
            current: current, // 当前显示图片的http链接  
            urls: this.data.imagesList // 需要预览的图片http链接列表  
        })
    },
    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        if (wx.setKeepScreenOn) {
            wx.setKeepScreenOn({
                keepScreenOn: true,
                success: function (res) {
                    //console.log('保持屏幕常亮')
                }
            })
        }
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    //清空log日志
    startClear: function () {
        var that = this;
        that.setData({
            textLog: ""
        });
    },
    //返回蓝牙是否正处于链接状态
    onBLEConnectionStateChange: function (onFailCallback) {
        wx.onBLEConnectionStateChange(function (res) {
            // 该方法回调中可以用于处理连接意外断开等异常情况
            console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`);
            return res.connected;
        });
    },
    //断开与低功耗蓝牙设备的连接
    closeBLEConnection: function () {
        var that = this;
        wx.closeBLEConnection({
            deviceId: that.data.deviceId
        })
        that.setData({
            connected: false,

        });
        wx.showToast({
            title: '连接已断开',
            icon: 'success'
        });
        setTimeout(function () {
            wx.navigateBack();
        }, 2000)
    },
    //获取蓝牙设备某个服务中的所有 characteristic（特征值）
    getBLEDeviceCharacteristics: function (order) {
        var that = this;
        wx.getBLEDeviceCharacteristics({
            deviceId: that.data.deviceId,
            serviceId: that.data.serviceId,
            success: function (res) {
                for (let i = 0; i < res.characteristics.length; i++) {
                    let item = res.characteristics[i]
                    if (item.properties.read) { //该特征值是否支持 read 操作
                        var log = that.data.textLog + "该特征值支持 read 操作:" + item.uuid + "\n";
                        that.setData({
                            textLog: log,
                            readCharacteristicId: item.uuid
                        });
                    }
                    if (item.properties.write) { //该特征值是否支持 write 操作
                        var log = that.data.textLog + "该特征值支持 write 操作:" + item.uuid + "\n";
                        that.setData({
                            textLog: log,
                            writeCharacteristicId: item.uuid,
                            canWrite: true
                        });

                    }
                    if (item.properties.notify || item.properties.indicate) { //该特征值是否支持 notify或indicate 操作
                        var log = that.data.textLog + "该特征值支持 notify 操作:" + item.uuid + "\n";
                        that.setData({
                            textLog: log,
                            notifyCharacteristicId: item.uuid,
                        });
                        that.notifyBLECharacteristicValueChange();
                    }

                }

            }
        })
        // that.onBLECharacteristicValueChange();   //监听特征值变化
    },
    //启用低功耗蓝牙设备特征值变化时的 notify 功能，订阅特征值。
    //注意：必须设备的特征值支持notify或者indicate才可以成功调用，具体参照 characteristic 的 properties 属性
    notifyBLECharacteristicValueChange: function () {
        var that = this;
        wx.notifyBLECharacteristicValueChange({
            state: true, // 启用 notify 功能
            deviceId: that.data.deviceId,
            serviceId: that.data.serviceId,
            characteristicId: that.data.notifyCharacteristicId,
            success: function (res) {
                var log = that.data.textLog + "notify启动成功" + res.errMsg + "\n";
                that.setData({
                    textLog: log,
                });
                that.onBLECharacteristicValueChange(); //监听特征值变化
            },
            fail: function (res) {
                wx.showToast({
                    title: 'notify启动失败',
                    mask: true
                });
                setTimeout(function () {
                    wx.hideToast();
                }, 2000)
            }

        })

    },
    //监听低功耗蓝牙设备的特征值变化。必须先启用notify接口才能接收到设备推送的notification。
    onBLECharacteristicValueChange: function () {
        var that = this;
        wx.onBLECharacteristicValueChange(function (res) {
            var resValue = utils.ab2hext(res.value); //16进制字符串
            var resValueStr = utils.hexToString(resValue);

            var log0 = that.data.textLog + "成功获取：" + resValueStr + "\n";
            that.setData({
                textLog: log0,
            });

        });
    },
    //orderInput
    orderInput: function (e) {
        this.setData({
            orderInputStr: e.detail.value
        })
    },

    //发送指令
    sentOrder: function () {
        console.log("now send order to epaper")
        var that = this;
        var order = that.data.monoimagedata; //指令
        //  let order = utils.stringToBytes(orderStr);
        console.log("now send order to epaper, data length is : " + order.byteLength);
        that.writeBLECharacteristicValue(order.buffer);
    },

    //向低功耗蓝牙设备特征值中写入二进制数据。
    //注意：必须设备的特征值支持write才可以成功调用，具体参照 characteristic 的 properties 属性
    writeBLECharacteristicValue: function (order) {
        var that = this;
        let byteLength = order.byteLength;

        console.log("writeBLECharacteristicValue")
        wx.writeBLECharacteristicValue({
            deviceId: that.data.deviceId,
            serviceId: that.data.serviceId,
            characteristicId: that.data.writeCharacteristicId,
            // 这里的value是ArrayBuffer类型
            value: order.slice(0, 20),
            success: function (res) {
                if (byteLength > 20) {
                    setTimeout(function () {
                        that.writeBLECharacteristicValue(order.slice(20, byteLength));
                    }, 0);
                }

            },

            fail: function (res) {

            }
        })
    },

})
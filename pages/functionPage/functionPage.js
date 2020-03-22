// pages/funtionPage/funtionPage.js
var app = getApp();
var utils = require("../../utils/util.js");


//-------------------------------------------
function setVal(p, i, c, curPal) {
  p[i] = curPal[c][0];
  p[i + 1] = curPal[c][1];
  p[i + 2] = curPal[c][2];
  p[i + 3] = 255;
}
//-------------------------------------------
function addVal(c, r, g, b, k) {
  return [c[0] + (r * k) / 32, c[1] + (g * k) / 32, c[2] + (b * k) / 32];
}

function getErr(r, g, b, stdCol) {
  r -= stdCol[0];
  g -= stdCol[1];
  b -= stdCol[2];
  return r * r + g * g + b * b;
}
//-------------------------------------------
function getNear(r, g, b, curPal) {
  var ind = 0;
  var err = getErr(r, g, b, curPal[0]);
  for (var i = 1; i < curPal.length; i++) {
    var cur = getErr(r, g, b, curPal[i]);
    if (cur < err) { err = cur; ind = i; }
  }
  return ind;
}

//Floyd-Steinberg algurism
function floydSteinberg(isYellow, pSrc, pDst) {
  console.log("in floydSteinberg callback");
  var dX, dY, dW = 640, dH = 384, sW = 640, sH = 384, index;
  var curPal;
  if (!isYellow)
    curPal = [[0, 0, 0], [255, 255, 255]];
  else
    // black white yellow
    curPal = [[0, 0, 0], [255, 255, 255], [220, 180, 0]];



  var aInd = 0;
  var bInd = 1;
  var errArr = new Array(2);
  errArr[0] = new Array(dW);
  errArr[1] = new Array(dW);

  for (var i = 0; i < dW; i++)
    errArr[bInd][i] = [0, 0, 0];

  for (var j = 0; j < dH; j++) {
    var y = dY + j;

    if ((y < 0) || (y >= sH)) {
      for (var i = 0; i < dW; i++, index += 4)setVal(pDst, index, (i + j) % 2 == 0 ? 1 : 0, curPal);
      console.log("invalid y : " + y)
      continue;
    }

    aInd = ((bInd = aInd) + 1) & 1;
    for (var i = 0; i < dW; i++)errArr[bInd][i] = [0, 0, 0];

    for (var i = 0; i < dW; i++) {
      var x = dX + i;

      if ((x < 0) || (x >= sW)) {
        setVal(pDst, index, (i + j) % 2 == 0 ? 1 : 0, curPal);
        index += 4;
        console.log("invalid x : " + x)
        continue;
      }

      var pos = (y * sW + x) * 4;
      var old = errArr[aInd][i];
      var r = pSrc[pos] + old[0];
      var g = pSrc[pos + 1] + old[1];
      var b = pSrc[pos + 2] + old[2];
      var colVal = curPal[getNear(r, g, b, curPal)];
      pDst[index++] = colVal[0];
      pDst[index++] = colVal[1];
      pDst[index++] = colVal[2];
      pDst[index++] = 255;
      r = (r - colVal[0]);
      g = (g - colVal[1]);
      b = (b - colVal[2]);

      if (i == 0) {
        errArr[bInd][i] = addVal(errArr[bInd][i], r, g, b, 7.0);
        errArr[bInd][i + 1] = addVal(errArr[bInd][i + 1], r, g, b, 2.0);
        errArr[aInd][i + 1] = addVal(errArr[aInd][i + 1], r, g, b, 7.0);
      } else if (i == dW - 1) {
        errArr[bInd][i - 1] = addVal(errArr[bInd][i - 1], r, g, b, 7.0);
        errArr[bInd][i] = addVal(errArr[bInd][i], r, g, b, 9.0);
      } else {
        errArr[bInd][i - 1] = addVal(errArr[bInd][i - 1], r, g, b, 3.0);
        errArr[bInd][i] = addVal(errArr[bInd][i], r, g, b, 5.0);
        errArr[bInd][i + 1] = addVal(errArr[bInd][i + 1], r, g, b, 1.0);
        errArr[aInd][i + 1] = addVal(errArr[aInd][i + 1], r, g, b, 7.0);
      }
      //console.log("rgb : "+ colVal[0]+":"+colVal[1]+":"+colVal[2])
    }
  }
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
    monoimagedata: []
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
          imagesList: tempFilePaths
        })
        console.log(tempFilePaths[0])

        const canvasctx = wx.createCanvasContext('canvassrc');


        canvasctx.drawImage(tempFilePaths[0], 0, 0, 640, 384);
        canvasctx.draw(false,
          function () {

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

                const dstData = new Uint8ClampedArray(res.data.length);





                



               // const canvasctx = wx.createCanvasContext('canvassrc');
               // Canvas.createImageData(640,384)

                //floydSteinberg(false, res.data, dstData);
                //console.log(dstData)
                // process image to 
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
          if (item.properties.read) {//该特征值是否支持 read 操作
            var log = that.data.textLog + "该特征值支持 read 操作:" + item.uuid + "\n";
            that.setData({
              textLog: log,
              readCharacteristicId: item.uuid
            });
          }
          if (item.properties.write) {//该特征值是否支持 write 操作
            var log = that.data.textLog + "该特征值支持 write 操作:" + item.uuid + "\n";
            that.setData({
              textLog: log,
              writeCharacteristicId: item.uuid,
              canWrite: true
            });

          }
          if (item.properties.notify || item.properties.indicate) {//该特征值是否支持 notify或indicate 操作
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
        that.onBLECharacteristicValueChange();   //监听特征值变化
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
    var that = this;
    var orderStr = that.data.orderInputStr;//指令
    let order = utils.stringToBytes(orderStr);
    that.writeBLECharacteristicValue(order);
  },

  //向低功耗蓝牙设备特征值中写入二进制数据。
  //注意：必须设备的特征值支持write才可以成功调用，具体参照 characteristic 的 properties 属性
  writeBLECharacteristicValue: function (order) {
    var that = this;
    let byteLength = order.byteLength;
    var log = that.data.textLog + "当前执行指令的字节长度:" + byteLength + "\n";
    that.setData({
      textLog: log,
    });

    wx.writeBLECharacteristicValue({
      deviceId: that.data.deviceId,
      serviceId: that.data.serviceId,
      characteristicId: that.data.writeCharacteristicId,
      // 这里的value是ArrayBuffer类型
      value: order.slice(0, 20),
      success: function (res) {
        if (byteLength > 20) {
          setTimeout(function () {
            // that.writeBLECharacteristicValue(order.slice(20, byteLength));
          }, 150);
        }
        var log = that.data.textLog + "写入成功：" + res.errMsg + "\n";
        that.setData({
          textLog: log,
        });
      },

      fail: function (res) {
        var log = that.data.textLog + "写入失败" + res.errMsg + "\n";
        that.setData({
          textLog: log,
        });
      }
    })
  },

})
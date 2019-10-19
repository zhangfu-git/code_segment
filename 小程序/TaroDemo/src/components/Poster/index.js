import Taro from '@tarojs/taro';
import { Canvas } from '@tarojs/components';
import QR from './qrcode.js';
import base64src from './base64img.js';
import defaultBg from './bg.jpeg';

class Poster extends Taro.PureComponent {
  static defaultProps = {
    width: 1080,
    height: 1917
  }
  constructor(props) {
    super(props);
    this.canvas = {
      width: props.width,
      height: props.height
    }

    this.posterTempFilePath = '';
  }
  // 获取网络图片信息处理
  async getWebImageInfo(imgSrc) {
    if (!imgSrc) {
      Taro.hideLoading();
      return Taro.showToast({
        title: '图片链接无效',
        icon: 'none'
      });
    }
    const res = await Taro.getImageInfo({
      src: imgSrc
    });
    if (res.errMsg === 'getImageInfo:ok') {
      return new Promise((resolve) => {
        resolve(res.path)
      });
    }
    Taro.hideLoading();
    Taro.showToast({
      title: '网络请求失败, 请重试!',
      icon: 'none'
    });
  }
  // 获取用户信息
  getUserInfo() {
    let user;
    // 如果外部有一个返回user信息的函数, 使用外部函数返回的user
    if (typeof this.props.getUserInfo === 'function') {
      user = this.props.getUserInfo();
    } else {
      user = Taro.getStorageSync('userMeGetInfo'); 
    }
    return user;
  }
  // 获取用户头像信息
  async getHeadImageInfo() {
    // 获取本地存储的user
    const user = this.getUserInfo();
    const avatarUrl = user && user.avatarUrl;
    const imgSrc = await this.getWebImageInfo(avatarUrl);
    return new Promise((resolve) => {
      resolve(imgSrc);
    });
  }

  // 生成二维码并且返回二维码图片信息
  async getQrcodeImageInfo(shareUrl) {
    const imgBase64 = QR.drawImg(shareUrl, {
      typeNumber: 4,
      errorCorrectLevel: 'M',
      size: 100
    });
  
    const imgSrc = await base64src(imgBase64);
    return Promise.resolve(imgSrc);
  }

  // 海报导出
  async canvasToTempFilePath() {
    // 先canvas转换为图片路径
    const res = await Taro.canvasToTempFilePath({
      canvasId: 'posterCanvas',
      width: this.canvas.width,
      height: this.canvas.height,
      destWidth: this.canvas.width,
      destHeight: this.canvas.height
    }, this.$scope);

    Taro.hideLoading();

    if (res.errMsg !== 'canvasToTempFilePath:ok') {
      return Taro.showToast({
        title: '海报导出失败',
        icon: 'none'
      });
    }

    this.posterTempFilePath = res.tempFilePath;

    // 调用父组件的函数, 通知海报导出成功
    this.props.onSuccessCreated && this.props.onSuccessCreated(res.tempFilePath);
  }
  // 保存海报
  save = () => {
    console.log(this.posterTempFilePath)
    const res = Taro.saveImageToPhotosAlbum({
      filePath: this.posterTempFilePath,
      success: (data) => {
        Taro.showToast({
          title: '保存成功',
          complete: () => {
            this.props.onSaveSuccessed && this.props.onSaveSuccessed();
          }
        });
      },
      fail: (err) => {
        if (err.errMsg === 'saveImageToPhotosAlbum:fail auth deny') {
          this.getAuthSaveImageToPhotosAlbum();
        }
      }
    });
  }
  getAuthSaveImageToPhotosAlbum() {
    Taro.showModal({
      title: '是否授权相册',
      content: '海报保存到相册, 请确定授权',
      success: (res) => {
        if (res.confirm) {
          Taro.openSetting({
            success: (settingdata) => {
              if (settingdata.authSetting['scope.writePhotosAlbum']) {
                this.save();
              } else {
                Taro.showToast({
                  title: '拒绝无法保存图片到相册',
                  icon: 'none'
                });
              }
            }
          })
        }
      }
    });
  }
  // 绘制海报并导出海报
  async draw(data) {
    // 渲染需要的数据(调用的使用传递进来)
    this.drawData = data || {};

    const ctx = Taro.createCanvasContext('posterCanvas', this.$scope);

    // this.props.onDraw(ctx, this.canvas);
    if (typeof this.props.onDraw === 'function') {
      const res = await this.props.onDraw(ctx, this.canvas);
     
      if (!res) return Taro.showToast({
        title: 'onDraw 必须返回true 才能绘制',
        icon: 'none'
      });
      return ctx.draw(false, ()=> {
        this.canvasToTempFilePath();
      });
    }
    
    // 如果没有自定义绘制函数, 则使用默认的绘制方式
    await this.defaultDraw(ctx);
    ctx.draw(false, () => {
      this.canvasToTempFilePath();
    });
  }
  // 圆角剪切
  roundRect(ctx, x, y, w, h, r) {
    // 开始绘制
    ctx.beginPath()
    // 因为边缘描边存在锯齿，最好指定使用 transparent 填充
    // 这里是使用 fill 还是 stroke都可以，二选一即可
    ctx.setFillStyle('transparent')
    // ctx.setStrokeStyle('transparent')
    // 左上角
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)

    // border-top
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.lineTo(x + w, y + r)
    // 右上角
    ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2)

    // border-right
    ctx.lineTo(x + w, y + h - r)
    ctx.lineTo(x + w - r, y + h)
    // 右下角
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5)

    // border-bottom
    ctx.lineTo(x + r, y + h)
    ctx.lineTo(x, y + h - r)
    // 左下角
    ctx.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI)

    // border-left
    ctx.lineTo(x, y + r)
    ctx.lineTo(x + r, y)

    // 这里是使用 fill 还是 stroke都可以，二选一即可，但是需要与上面对应
    ctx.fill()
    // ctx.stroke()
    ctx.closePath()
    // 剪切
    ctx.clip()
  }

  //处理文字多出省略号显示
  dealWords(options) {
    options.ctx.setFontSize(options.fontSize); //设置字体大小
    let allRow = Math.ceil(options.ctx.measureText(options.word).width / options.maxWidth); //实际总共能分多少行
    let count = allRow >= options.maxLine ? options.maxLine : allRow; //实际能分多少行与设置的最大显示行数比，谁小就用谁做循环次数

    let endPos = 0; //当前字符串的截断点

    for (let j = 0; j < count; j++) {
      let nowStr = options.word.slice(endPos); //当前剩余的字符串
      let rowWid = 0; //每一行当前宽度    
      if (options.ctx.measureText(nowStr).width > options.maxWidth) { //如果当前的字符串宽度大于最大宽度，然后开始截取
        for (let m = 0; m < nowStr.length; m++) {
          rowWid += options.ctx.measureText(nowStr[m]).width; //当前字符串总宽度
          if (rowWid > options.maxWidth) {
            if (j === options.maxLine - 1) { //如果是最后一行
              options.ctx.fillText(nowStr.slice(0, m - 1) + '...', options.x, options.y + (j + 1) * 18); //(j+1)*18这是每一行的高度        
            } else {
              options.ctx.fillText(nowStr.slice(0, m), options.x, options.y + (j + 1) * 18);
            }
            endPos += m; //下次截断点
            break;
          }
        }
      } else { //如果当前的字符串宽度小于最大宽度就直接输出
        options.ctx.fillText(nowStr.slice(0), options.x, options.y + (j + 1) * 18);
      }
    }
  }
  // 默认自带的绘制
  async defaultDraw(ctx) {
    Taro.showLoading({
      title: '正在绘制中'
    });

    // 绘制背景图片, this.canvas是在constructor中定义, 默认width: 1080, height: 1917
    // defaultBg是本地一张默认的图片, import defaultBg from './bg.jpeg'; 如果使用网络图片, 请wx.getImageInfo获取临时图片路径
    ctx.drawImage(defaultBg, 0, 0, 474, 842, 0, 0, this.canvas.width, this.canvas.height);

    // 圆角矩形进行剪切
    this.roundRect(ctx, 40, 40, this.canvas.width - 80, this.canvas.height - 80, 30);
    // 绘制圆角矩形
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制海报标题
    if (this.drawData.title) {
      ctx.setFillStyle('#333');
      ctx.setFontSize(40);
      this.dealWords({
        ctx,
        fontSize: 50,
        word: this.drawData.title,
        maxWidth: this.canvas.width - 120 * 2,
        x: 120,
        y: 120,
        maxLine: 1
      });
    }

    // 绘制副标题
    if (this.drawData.subTitle) {
      ctx.setFillStyle('#666');
      ctx.setFontSize(30);
      this.dealWords({
        ctx,
        fontSize: 30,
        word: this.drawData.subTitle,
        maxWidth: this.canvas.width - 120 * 2,
        x: 120,
        y: 180,
        maxLine: 1
      });
    }

    // 绘制主要的海报
    if (this.drawData.posterImg) {
      let _img = this.drawData.posterImg;
      let reg = /^(http|https):\/\/([\w.]+\/?)\S*/;
      if (reg.test(this.drawData.posterImg)) {
        _img = await this.getWebImageInfo(this.drawData.posterImg);
      }
      ctx.drawImage(
        _img,
        120,
        260,
        820,
        1200,
      );
    }
    
    // 绘制用户信息
    const nickName = this.getUserInfo().nickName;
    const headImg = await this.getHeadImageInfo();

    const avatarInfo = {
      w: 120,
      h: 120,
      x: 100,
      y: this.canvas.height - 380
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarInfo.w / 2 + avatarInfo.x,
      avatarInfo.h / 2 + avatarInfo.y,
      avatarInfo.w / 2,
      0,
      Math.PI * 2,
      false
    );
    ctx.clip();

    ctx.drawImage(
      headImg,
      avatarInfo.x - 6,
      avatarInfo.y - 6,
      avatarInfo.w + 10,
      avatarInfo.h + 10
    );

    // 释放之前保存的绘制
    ctx.restore();

    // 设置字体和颜色
    ctx.setFillStyle('#333');
    ctx.setFontSize(30);
    
    // 绘制用户的昵称 
    ctx.fillText(nickName, avatarInfo.x + avatarInfo.w + 10 , avatarInfo.y + 80);
    
    // 绘制昵称下面的一段标语
    ctx.setFillStyle('#999');
    ctx.setFontSize(60);
    if (this.drawData.tips) {
      ctx.fillText(this.drawData.tips, avatarInfo.x, avatarInfo.y + 250);
    }

    // // 绘制动态二维码
    const shareUrl = this.drawData.shareUrl;
    const qrCodeImage = await this.getQrcodeImageInfo(shareUrl);

    ctx.drawImage(
      qrCodeImage,
      this.canvas.width - 400,
      avatarInfo.y,
      300,
      300
    );

    // 返回一些promise让该函数可以使用async await
    return Promise.resolve();
  }
  render() {
    const { width, height } = this.props;
    return (
      <Canvas canvasId="posterCanvas" style={`width: ${width}px; height:${height}px;position:fixed;left: -10000px;`}></Canvas>
    )
  }
}

export default Poster;
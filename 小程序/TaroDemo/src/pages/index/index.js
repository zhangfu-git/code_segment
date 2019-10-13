import Taro, { Component } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import Poster from '../../components/Poster';
import './index.less'
import img from './1.jpg';

export default class Index extends Component {

  config = {
    navigationBarTitleText: '首页'
  }
  state = {
    imageSrc: ''
  }
  componentWillMount () { }

  componentDidMount () { }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }
  onSuccessCreated(imageSrc) {
    console.log('绘制完成', imageSrc)
    this.setState({
      imageSrc: imageSrc
    });
  }
  save() {
    this.$poster.save();
  }
  createPoster() {
    this.$poster.draw({
      title: 'I hope I can protect the one thing i can\'t live without',
      subTitl: 'Today is the first day of what\'s left of you life',
      tips: 'Iron Man',
      shareUrl: 'https://www.jianshu.com/u/0427dce733d3',
      posterImg: img,
    })
  }
  returnUserInfo() {
    return {
      nickName: '内孤',
      avatarUrl: 'https://upload.jianshu.io/users/upload_avatars/3118313/d36ca6d9-04c3-4d6c-ba6a-28335df247db.jpeg?imageMogr2/auto-orient/strip|imageView2/1/w/240/h/240'
    }
  }
  render () {
    const { imageSrc } = this.state;
    return (
      <View className='index'>
        <Button onClick={this.createPoster.bind(this)}>生成海报</Button>
        <Button onClick={this.save.bind(this)}>保存海报</Button>
        <Poster
          ref={node=>this.$poster=node}
          getUserInfo={this.returnUserInfo.bind(this)}
          onSuccessCreated = {
            this.onSuccessCreated.bind(this)
          }
        />
        <Image src={imageSrc} className="posterImage" />
      </View>
    )
  }
}

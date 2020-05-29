import React, { Component } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Image,
  PanResponder,
  ViewPropTypes,
  TouchableOpacity,
  Text
} from "react-native";
import { Icon } from "react-native-elements";
import resolveAssetSource from "react-native/Libraries/Image/resolveAssetSource";
import PropTypes from "prop-types";

const window = Dimensions.get("window");
const WW = window.width;
const WH = window.height;

export default class ImageEdit extends Component {
  static propTypes = {
    image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    minWidth: PropTypes.number,
    scaled: PropTypes.bool,
    editing: PropTypes.bool,
    showEditButton: PropTypes.bool,
    showSaveButtons: PropTypes.bool,
    showGrids: PropTypes.bool,
    cropIn: PropTypes.bool,
    containerStyle: ViewPropTypes.style,
    areaStyle: ViewPropTypes.style,
    gridStyle: ViewPropTypes.style,
    backgroundColor: PropTypes.string,
    gridColor: PropTypes.string,
    buttonsColor: PropTypes.string,
    onEdit: PropTypes.func,
    onSave: PropTypes.func,
    onCancel: PropTypes.func,
    saveButtonText: PropTypes.string,
    cancelButtonText: PropTypes.string
  };

  static defaultProps = {
    image: "",
    width: WW,
    height: WW,
    scaled: false,
    editing: false,
    showEditButton: true,
    showSaveButtons: true,
    showGrids: true,
    cropIn: false,
    containerStyle: {},
    areaStyle: {},
    gridStyle: {},
    backgroundColor: this.defaultColor,
    gridColor: this.defaultColor,
    buttonsColor: this.defaultColor,
    saveButtonText: "Save",
    cancelButtonText: "Cancel",
    minWidth: 500
  };

  static imageDefaults = {
    type: 'image',
    uri: null,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    real_width: 0,
    real_height: 0,
    rotate: 0
  };

  constructor(props) {
    super(props);

    this.state = {
      width: this.props.width,
      height: this.props.height,
      scaled: this.props.scaled,
      image: ImageEdit.imageDefaults,
      cropIn: this.props.cropIn,
      editing: this.props.editing,
      editingProp: this.props.editing,
      isPinching: false,
      isMoving: false,
    };

    this.defaultColor = "#C1272D";
    this.image = null;
    this.initW = 0;
    this.initH = 0;
    this.initX = 0;
    this.initY = 0;
    this.initDistance = 0;
    this._panResponder = null;
    this._panBlockNative = this.state.editing;
  }

  getPanResponder(){
    if(this._panBlockNative != this.state.editing || !this._panResponder){
      this._panResponder = PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => {},
        onPanResponderMove: this.onMove.bind(this),
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onPanResponderRelease: this.onRelease.bind(this),
        onPanResponderTerminate: this.onRelease.bind(this),
        onShouldBlockNativeResponder: (evt, gestureState) => {
          return this.state.editing;
        }
      });
      this._panBlockNative = this.state.editing;
    }
    return this._panResponder;
  }

  rotate(val) {
    var rotate = this.state.image.rotate;
    rotate += val;

    if(rotate < -270 || rotate > 270) {
      rotate = 0;
    }

    this.setState({
      image: {
        ...this.state.image,
        rotate: rotate,
      }
    });
  }

  getInfo() {
    var rotate = this.state.image.rotate;

    if(rotate == -270) {
      rotate = 90;
    }

    if(rotate == -180) {
      rotate = 180;
    }

    if(rotate == -90) {
      rotate = 270;
    }

    var x1 = (this.state.image.original_width / this.state.image.width) * this.state.image.x;
    var y1 = (this.state.image.original_height / this.state.image.height) * this.state.image.y;


    var x = x1;
    var y = y1;

    if(rotate == 180) {
      y = y1 + this.state.image.original_height - parseFloat(this.state.image.real_height).toPrecision(5);
      x = x1 + this.state.image.original_width - parseFloat(this.state.image.real_width).toPrecision(5);
    }

    if(rotate == 90) {
      y = x1;
      x = this.state.image.original_height - parseFloat(this.state.image.real_height).toPrecision(5) - Math.abs(y1); 
    }

    
    if(rotate == 270) {
      x = y1;
      y = x1 + this.state.image.original_width - parseFloat(this.state.image.real_width).toPrecision(5);
    }

    var w = this.state.image.real_width;

    var data = {
      w: w,
      h: w,
      x: Math.abs(x),
      y: Math.abs(y),
      rotate: rotate,
      filename: this.state.image.uri
    };

    return data;
  }

  componentDidUpdate(){
    this.fixImageSize();
  }

  fixImageSize(){
    if(this.state.image.uri && (!this.state.image.width)) {
      let uri = this.state.image.uri;
      if(/^http/i.test(uri) || /^file:/.test(uri)){
        Image.getSize(
            uri,
            (w, h) => {
              let sd = ImageEdit.scaledDimensions({width: this.state.width, height: this.state.height}, {width: w, height: h});
              var real_width = sd.original_height;
              var real_height = sd.original_height;

              if(sd.original_height > sd.original_width) {
                real_width = sd.original_width;
                real_height = sd.original_width;
              }
              
              this.setState({image: { ...this.state.image,
                width: sd.width,
                height: sd.height,
                scale: sd.scale,
                original_width: sd.original_width,
                original_height: sd.original_height,
                real_width: real_width,
                real_height: real_height,
                rotate: (this.state.image.rotate ? this.state.image.rotate : 0)
              }});
            },
            () => {}
        );
      }
    }
  }

  static changed(props, state) {
    let image =
        typeof props.image == "object" ? props.image : { uri: props.image };
    return (
        props.width != state.width ||
        props.height != state.height ||
        state.image.uri != image.uri ||
        props.editing != state.editingProp ||
        props.cropIn != state.cropIn ||
        props.scaled != state.scaled
    );
  }

  static getDerivedStateFromProps(props, state) {
    let changed = ImageEdit.changed(props, state);
    if (changed)
      return ImageEdit._build(props, state) || null;

    return null;
  }

  static scaledDimensions(area, dim){
    let width = dim.width || 0,
        height = dim.height || 0;

    //Scale image size to the area
    var new_iw = area.width;
    var new_ih = (new_iw * height) / width;
    if (new_ih < area.height) {
      new_ih = area.height;
      new_iw = (new_ih * width) / height;
    }

    return {
      original_width: width,
      original_height: height,
      width: new_iw,
      height: new_ih,
      scale: new_iw/width
    }
  }

  static _build(props, state) {
    let info = {},
        w = props.width || WW,
        h = props.height || WW,
        image = typeof props.image == "object" ? props.image : (props.image ? { ...ImageEdit.imageDefaults, uri: props.image} : null)

    if (typeof props.width != 'undefined' || !state.image.width) info.width = w;
    if (typeof props.height != 'undefined' || !state.image.height) info.height = h;

    if (typeof props.editing != 'undefined') {
      info.editing = props.editing;
      info.editingProp = props.editing;
    }
    if (typeof props.cropIn != 'undefined') info.cropIn = props.cropIn;
    if (typeof props.scaled != 'undefined') info.scaled = props.scaled;
    else info.scaled = state.scaled;

    if (image && image.uri != state.image.uri){
      image.x = image.x || 0;
      image.y = image.y || 0;
      let hasDimensions = true;
      if(!image.width && !image.height){
        hasDimensions = false;
        if(ImageEdit.isNumeric(image.uri)){
          let s = resolveAssetSource(image.uri);
          if(s) image = {...image, ...s, path: s.uri};
        } else {
          let size = resolveAssetSource({ uri: image.uri });
          if (size.width && size.height){
            image.width = size.width;
            image.height = size.height;
          }
        }

      }

      let ext = (image.path || image.url || image.uri).toLowerCase().split('.');
      ext = ext[ext.length-1];
      let type = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic"].includes(ext) || (image.mime && /image/.test(image.mime)) ? 'image' : 'video';
      image.type = type;

      if(image.width && image.height && (!info.scaled || (info.scaled && !hasDimensions))){
        let sd = ImageEdit.scaledDimensions({width: w, height: h}, {width: image.width, height: image.height});
        image.width = sd.width;
        image.height = sd.height;
        image.scale = sd.scale;
        image.original_height = sd.original_height;
        image.original_width = sd.original_width;

        image.real_width = sd.original_height;
        image.real_height = sd.original_height;

        if(sd.original_height > sd.original_width) {
          image.real_width = sd.original_width;
          image.real_height = sd.original_width;
        }
      }

      info.image = image;
    }
    return info;

  }

  static isNumeric(n){
    return !isNaN(n) && isFinite(n);
  }

  enable() {
    this.setState({ editing: true });
  }

  disable() {
    this.setState({ editing: false });
  }

  onEdit() {
    this.setState({ editing: true });
    if (this.props.onEdit) this.props.onEdit();
  }

  onCancel() {
    this.setState({ editing: false });
    if (this.props.onCancel) this.props.onCancel();
  }

  onSave() {
    this.setState({ editing: false });
    let info = this.getInfo();
    if (this.props.onSave) this.props.onSave(info);
  }

  onRelease(e) {
    if (!this.state.editing) return;
    this.setState({ isPinching: false, isMoving: false });
    this.distance = 0;
  }

  getRealSizeZoom(info, new_ih, new_iw) {
    var original_width = info.image.original_width;
    var original_height = info.image.original_height;

    var h_ratio = new_ih/this.props.width;
    var w_ratio = new_iw/this.props.width;

    return {
      width: original_width / w_ratio,
      height: original_height / h_ratio
    }
  }

  onMove(e, gestureState) {
    e.persist();
    if (!this.state.editing) return;

    //Pinching
    if (e.nativeEvent.touches.length == 2) {
      let x1 = e.nativeEvent.touches[0].locationX;
      let y1 = e.nativeEvent.touches[0].locationY;
      let x2 = e.nativeEvent.touches[1].locationX;
      let y2 = e.nativeEvent.touches[1].locationY;

      let a = x1 - x2;
      let b = y1 - y2;
      let dist = Math.sqrt(a * a + b * b);

      let info = {};

      if (this.state.isPinching) {
        this.distance = dist - this.initDistance;
        info.image = {
          ...this.state.image,
          width: this.initW + this.distance,
          height: this.initH + this.distance
        };

        if (!this.state.cropIn) {
          //Keep the image size >= to crop area
          let new_iw = info.image.width,
              new_ih = info.image.height;

          if (this.state.width > info.image.width) {
            new_iw = this.state.width;
            new_ih = (new_iw * this.initH) / this.initW;
          }

          if (this.state.height > new_ih) {
            new_ih = this.state.height;
            new_iw = (new_ih * this.initW) / this.initH;
          }

          var real_size = this.getRealSizeZoom(info, new_ih, new_iw);

          if(real_size.width < this.props.minWidth) {
            return false;
          }
          
          info.image.width = new_iw;
          info.image.height = new_ih;

          info.image.real_width = real_size.width;
          //info.image.real_height = real_size.width;
          info.image.real_height = real_size.height;


          //position
          let x = this.state.image.x;
          let y = this.state.image.y;
          let maxx = -1 * Math.abs(info.image.width - this.state.width),
              maxy = -1 * Math.abs(info.image.width - this.state.height);

          if (x < maxx) x = maxx;
          if (x > 0) x = 0;
          if (y < maxy) y = maxy;
          if (y > 0) y = 0;
          info.image.x = x;
          info.image.y = y;
        }
      } else {
        this.initW = this.state.image.width;
        this.initH = this.state.image.height;
        this.initDistance = dist;
        info.isPinching = true;
      }

      this.setState(info);
    } else if (e.nativeEvent.touches.length == 1) {

      //Moving
      if (this.state.isMoving) {

        let x = this.initX + gestureState.dx,
            y = this.initY + gestureState.dy;

        if(this.state.image.rotate) {
          if(this.state.image.rotate == 90 || this.state.image.rotate == -270) {
            x = this.initX + gestureState.dy,
            y = this.initY - gestureState.dx;
          }

          if(this.state.image.rotate == 180 || this.state.image.rotate == -180) {
            x = this.initX - gestureState.dx;
            y = this.initY - gestureState.dy;
          }

          if(this.state.image.rotate == 270 || this.state.image.rotate == -90) {
            x = this.initX - gestureState.dy,
            y = this.initY + gestureState.dx;
          }
        }

        if (!this.state.cropIn) {
          let maxx = -1 * Math.abs(this.state.image.width - this.state.width),
              maxy = -1 * Math.abs(this.state.image.height - this.state.height);

          if (x < maxx) x = maxx;
          if (x > 0) x = 0;
          if (y < maxy) y = maxy;
          if (y > 0) y = 0;
        }

        this.setState({
          image: {
            ...this.state.image,
            x: x,
            y: y
          }
        });
      } else {
        this.initX = this.state.image.x;
        this.initY = this.state.image.y;
        this.setState({ isMoving: true });
      }
    }
  }

  //Render Image
  renderImage() {
    if (this.state.image.uri){
      let uri = this.state.image.path ? this.state.image.path : this.state.image.uri;
      var style = {
        width : this.state.image.width,
        height: this.state.image.height,
        top: this.state.image.y,
        left: this.state.image.x,
      };

      return (
          <Image
              ref={ref => (this.image = ref)}
              style={style}
              source={{ uri: uri }}
              resizeMode={"stretch"}
          />
      );
    }
  }

  renderGrids() {
    if (!this.props.showGrids) return;
    return [
      <View
          key="gl1"
          style={[
            styles.gridLine,
            styles.gl1,
            {
              position: !this.state.editing ? "relative" : "absolute",
              display: !this.state.editing ? "none" : "flex"
            },
            {
              borderColor: this.props.gridColor
                  ? this.props.gridColor
                  : this.defaultColor
            },
            this.props.gridStyle
          ]}
      />,
      <View
          key="gl2"
          style={[
            styles.gridLine,
            styles.gl2,
            {
              position: !this.state.editing ? "relative" : "absolute",
              display: !this.state.editing ? "none" : "flex"
            },
            {
              borderColor: this.props.gridColor
                  ? this.props.gridColor
                  : this.defaultColor
            },
            this.props.gridStyle
          ]}
      />,
      <View
          key="gl3"
          style={[
            styles.gridLine,
            styles.gl3,
            {
              position: !this.state.editing ? "relative" : "absolute",
              display: !this.state.editing ? "none" : "flex"
            },
            {
              borderColor: this.props.gridColor
                  ? this.props.gridColor
                  : this.defaultColor
            },
            this.props.gridStyle
          ]}
      />,
      <View
          key="gl4"
          style={[
            styles.gridLine,
            styles.gl4,
            {
              position: !this.state.editing ? "relative" : "absolute",
              display: !this.state.editing ? "none" : "flex"
            },
            {
              borderColor: this.props.gridColor
                  ? this.props.gridColor
                  : this.defaultColor
            },
            this.props.gridStyle
          ]}
      />
    ];
  }

  renderButtons() {
    let buttons = [];
    if (!this.state.editing && this.props.showEditButton) {
      buttons.push(
          <TouchableOpacity
              key="editbtn"
              style={[
                styles.editButton,
                {
                  top: 10,
                  display: this.state.editing ? "none" : "flex",
                  position: this.state.editing ? "relative" : "absolute"
                }
              ]}
              onPress={this.onEdit.bind(this)}
          >
            <Icon
                reverse
                size={20}
                name="crop"
                color={
                  this.props.buttonsColor
                      ? this.props.buttonsColor
                      : this.defaultColor
                }
            />
          </TouchableOpacity>
      );
    } else if (this.state.editing && this.props.showSaveButtons) {
      buttons.push(
          <View key="buttonbtns" style={styles.buttonsWrap}>
            <TouchableOpacity
                style={[styles.cancelButton]}
                onPress={this.onCancel.bind(this)}
            >
              <Text style={styles.buttonText}>{this.props.cancelButtonText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: this.props.buttonsColor
                        ? this.props.buttonsColor
                        : this.defaultColor
                  }
                ]}
                onPress={this.onSave.bind(this)}
            >
              <Text style={styles.buttonText}>{this.props.saveButtonText}</Text>
            </TouchableOpacity>
          </View>
      );
    }

    return buttons;
  }

  //Render component children
  renderChildren() {
    if (this.props.children) return this.props.children;
  }

  render() {
    let pr = this.getPanResponder();
    return (
        <View style={[styles.wrapper, this.props.containerStyle]}>
          <View
              {...pr.panHandlers}
              style={[
                styles.cropArea,
                {
                  width: this.state.width,
                  height: this.state.height,
                  borderBottomWidth: !this.state.editing ? 0 : 0
                },
                {
                  backgroundColor: this.props.backgroundColor
                      ? this.props.backgroundColor
                      : this.defaultColor
                },
                this.props.areaStyle,
                {transform: [{ rotate: this.state.image.rotate ? this.state.image.rotate+'deg' : '0deg' }]}
              ]}
          >
              {this.renderImage()}
              {this.renderGrids()}

          </View>
          {this.renderChildren()}
          {this.renderButtons()}
        </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    height: '100%',
  },
  cropArea: {
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderColor: "#000000",
    borderStyle: "solid",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    overflow: "hidden"
  },
  grid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100
  },
  gridLine: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.5)",
    borderStyle: "solid",
    position: "absolute",
    width: "100%",
    height: 0.5,
    zIndex: 100
  },
  gl1: {
    top: "25%"
  },
  gl2: {
    top: "75%"
  },
  gl3: {
    left: "25%",
    width: 0.5,
    height: "100%"
  },
  gl4: {
    left: "75%",
    width: 0.5,
    height: "100%"
  },
  buttonsWrap: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  editButton: {
    position: "absolute",
    zIndex: 50,
    right: 10
  },
  saveButton: {
    backgroundColor: "rgba(0,0,0,1)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5
  },
  cancelButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14
  }
});


const PICTURE_COUNTDOWN = 2;

class App {
  constructor() {}
  async init() {
   
    this.video_wrapper = document.getElementById("video");
    this.canvas = document.createElement("canvas");

    this.ctx = this.canvas.getContext("2d");

    // console.dir(this.video);

    this.video = await this.createWebcam();
    const { innerWidth, innerHeight } = window;

    this.video.width = innerWidth;
    this.video.height = innerHeight;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;

    this.video_wrapper.appendChild(this.video);
    this.video_wrapper.appendChild(this.canvas);

    this.frameCount = 0;
    this.circles = [];
    this.texts = [];
    this.dataURLs = [];
    this.cachedPictures = {};
    // this.mediaPipe = new MediaPipeClient()
    this.loadPoseNetModel();
    this.loadFaceDetection();
    this.initMatter();
    //
    this.floor = new Ground();
    this.floor.groundLimit(this.MATTER);

    this.initListeners();

    this.isReadyFace = false;
    this.detectionOptions = {
      withLandmarks: true,
      withDescriptors: false,
    };
    this.faceDetections;
    this.detectFaces = [];
    this.counter = 0;
    this.cheese = 0;
    this.currentImageIndex = 0;
    this.info;
    this.picIndex;
    this.faceDetectionDuration = 0;
    this.noDetectionDuration = 0;
    this.changeState(2);
  }
  onKeydown(e) {
    // this.getPicture();
    // console.log(e.key);
    switch (e.key) {
      case "Enter":
        this.clearAllElement();
        break;
    }
  }

  //firebase
  initListeners() {
    document.addEventListener("keydown", this.onKeydown.bind(this));

    this.getInfoPicture = firebase
      .database()
      .ref("PICTURES-GESTS/PICTURES-STORAGE/");
    this.getInfoPicture.on("value", (snapshot) => {
      // const data = snapshot.val()
      this.dataURLs = Object.values(snapshot.val());
    });
  }

  initMatter() {
    this.MATTER = {
      Engine: Matter.Engine,
      Render: Matter.Render,
      World: Matter.World,
      Bodies: Matter.Bodies,
      engine: Matter.Engine.create(),
    };
    // this.floor = new Ground();
    // this.floor.groundLimit(this.MATTER);
  }

  async createWebcam() {
    const video = document.createElement("video");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    video.srcObject = stream;
    // this.videoIsReady = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        resolve();
      };
    });

    return video;
  }



  loadPoseNetModel() {
    this.poseNet = ml5.poseNet(this.video, this.modelLoaded.bind(this));
  }
  modelLoaded() {
    console.log("model loaded");
    this.isReady = true;
    this.draw();
    this.poseNet.on("pose", (results) => {
      if (!this.person && results && results[0])
        this.person = new Person(results[0].pose.keypoints, this.MATTER);
      this.poses = results;
    //   if (this.person == 1 && results && results[1])
    //   this.person2 = new Person(results[1].pose.keypoints, this.MATTER);
    // this.poses = results;
    });
  }
  // --------------------------------------------------
  // TRY TO ADD DETECTION
  loadFaceDetection() {
    this.faceApi = ml5.faceApi(
      this.video,
      this.detectionOptions,
      this.faceDetectionLoaded.bind(this)
    );
  }
  faceDetectionLoaded() {
    console.log("face detection ready");
    // this.isReady = true;
    this.draw();
    this.faceApi.detect(this.gotResults.bind(this));
  }
  gotResults(err, results) {
    if (err) {
      console.log(err);
      return;
    }

    this.faceDetections = results;
    this.faceApi.detect(this.gotResults.bind(this));
    this.isReadyFace = true;
  }

  takeAndSendFace(faceDetection) {
    const { x, y, w, h } = faceDetection;
    const bigSide = Math.max(w, h);
    const smallSide = Math.min(w, h);
    const picIndex = Date.now();

    const stretchVideoCanvas = document.createElement("canvas");
    const stretchCtx = stretchVideoCanvas.getContext("2d");

    stretchVideoCanvas.width = this.canvas.width;
    stretchVideoCanvas.height = this.canvas.height;

    stretchCtx.drawImage(
      this.video,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    const videoCanvas = document.createElement("canvas");
    const ctx = videoCanvas.getContext("2d");

    videoCanvas.width = smallSide;
    videoCanvas.height = smallSide;

    ctx.drawImage(
      stretchVideoCanvas,
      x,
      y,
      w,
      h,
      0,
      0,
      smallSide,
      smallSide
    );

    const imageString = videoCanvas.toDataURL("image/jpeg", 0.8);
    const image = new Image();
    image.src = imageString;
    // console.log(image);
    SEND_MESSAGE("PICTURES-GESTS/PICTURES-STORAGE/" + picIndex, imageString);
  }

  showFaceDetection() {
    if (this.faceDetections) {
      if (this.faceDetections.length > 0) {
        for (let i = 0; i < this.faceDetections.length; i += 1) {
          const alignedRect = this.faceDetections[i].alignedRect;
          const boxX = alignedRect._box._x;
          const boxY = alignedRect._box._y;
          const boxWidth = alignedRect._box._width;
          const boxHeight = alignedRect._box._height;
          let biggerPhotoX = boxWidth / 4;
          let biggerPhotoY = boxHeight / 4;
          let x = boxX - biggerPhotoX;
          let y = boxY 
          let w = boxWidth + 2 * biggerPhotoX;
          let h = boxHeight 
          this.detectFaces.splice(0, this.detectFaces.length);
          this.detectFaces.push(new FaceDetection(x, y, w, h));
          // this.detectFaces.forEach((face) => face.showFaceDetection(this.ctx));

          //!
          //*
          //?
        }
      }
    }
  }
  // --------------------------------------------------
  rainBubbles() {
    if (this.isReady && this.frameCount % 12 == 0) {
      this.circles.push(
        new Circle(
          Math.random() * window.innerWidth,
          -30,
          Math.random() * 40 + 20,
          null,
          this.MATTER
        )
      );
      this.frameCount = 0;
    }
  }

  async previousImage() {
    // this.imageToDisplay
    this.currentImageIndex = trueModulo(
      this.currentImageIndex - 1,
      this.dataURLs.length
    );

    const cachedImage = this.cachedPictures[this.currentImageIndex];

    let image = cachedImage;

    if (!image) {
      const dataURL = this.dataURLs[this.currentImageIndex];

      image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = dataURL;
        this.cachedPictures[this.currentImageIndex] = img;
      });
    }

    return image;
  }

  drawBubbles() {
    // DRAW
    for (let i = 0; i < this.circles.length; i++) {
      const posXBall = this.circles[i].body.position.x;
      const posYBall = this.circles[i].body.position.y;
      const radius = this.circles[i].body.circleRadius;
      //   let colorBall = this.circles[i].c;
      //   if (posYBall > 50) {
      //     colorBall = "#F00000";
      //   }

      if (
        this.person &&
        Matter.Collision.collides(
          this.circles[i].body,
          this.person.boundaries[0].body
        )
      ) {
        // console.log("HEAD TOUCHED");
        this.circles[i].c = "black";
        // this.circles[i].img = this.img

        this.previousImage()
          .then((img) => {
            this.circles[i].addImage(img);
          })
          .catch((e) => {
            console.log("no image found!");
          });
      }

      if (posYBall > window.innerHeight + 70) {
        let index = i;
        this.circles[i].removeFromWorld();
        this.circles.splice(index, 1);
      }

      this.circles[i].show(this.ctx);
    }
  }

  checkIfThereIsSomeone() {
    if (this.faceDetections) {
      if (this.faceDetections.length > 0) {
        this.faceDetectionDuration++;
        this.noDetectionDuration = 0;
      } else {
        this.noDetectionDuration++;
        if (this.noDetectionDuration >= 60) {
          this.faceDetectionDuration = 0;
        }
      }
    }
  }

  changeState(newState) {
    this.state = newState;

    switch (this.state) {
     
      case PICTURE_COUNTDOWN:
        {
          this.clearPersonPhysic();
          this.clearGroundPhysic();
          this.clearAllElement(); //? wtf il en reste 29
          this.floor = new Ground();
          this.floor.groundLimit(this.MATTER);

          // this.texts.forEach((text) => text.removeFromWorld(this.MATTER));
          // this.texts.length = 0;
        }
        break;

      case 3:
        {
          this.detectFaces.forEach((face) => {
            this.takeAndSendFace(face);
          });
          // this.floor = new Ground();
          // this.floor.groundLimit(this.MATTER);
          //facedetection duration = 0
        }
        break;
    }
  }

  draw() {
    this.ctx.fillStyle = "lightgrey";

    const { width, height } = this.canvas;

    this.ctx.fillRect(0, 0, width, height);
    this.ctx.drawImage(this.video, 0, 0, width, height);
    this.MATTER.Engine.update(this.MATTER.engine); //! was in a state before
    // console.log(this.MATTER.engine.world.bodies.length);

    switch (this.state) {

      case PICTURE_COUNTDOWN:
        this.checkIfThereIsSomeone();
        this.showFaceDetection();
        this.rainBubbles();
        this.drawBubbles();
        if (this.faceDetectionDuration >= 150) {
          this.faceDetectionDuration = 0;
          this.changeState(3);
        }

        break;
      case 3:
        this.rainBubbles();
        this.drawBubbles();
        //person
        if (this.person) {
          if (this.poses.length > 0) {
            this.counter = 0;
            this.person.update(this.poses[0].pose.keypoints);
          }
          // this.person.show(this.ctx);

          if (this.poses.length <= 0) {
            this.counter++;
            if (this.counter >= 200) {
              this.clearAllElement();
              this.clearPersonPhysic();
              this.counter = 0;
              this.changeState(PICTURE_COUNTDOWN);
            }
          }
        }

        break;
    }

    // this.MATTER.Engine.update(this.MATTER.engine); //! was in a state before
    this.frameCount++;

    //

    requestAnimationFrame(this.draw.bind(this));
    // requestAnimationFrame(() => this.draw());
  }

  clearAllElement() {
    this.circles.forEach((item) => item.removeFromWorld());
    this.circles.length = 0;
  }
  clearGroundPhysic() {
    this.floor.removeFromWorld(this.MATTER);
  }
  clearPersonPhysic() {
    if (this.person) {
      this.person.boundaries.forEach((item) => item.removeFromWorld());
      this.person.boundaries.length = 0;
      this.person.neck.removeFromWorld();
      this.person.chest.removeFromWorld();     
      this.person.armRight1.removeFromWorld(); 
      this.person.armRight2.removeFromWorld(); 
      this.person.armLeft1.removeFromWorld(); 
      this.person.armLeft2.removeFromWorld(); 
      this.person.legRight1.removeFromWorld(); 
      this.person.legRight2.removeFromWorld(); 
      this.person.legLeft1.removeFromWorld(); 
      this.person.legLeft2.removeFromWorld(); 
 
      this.person = null;
    }

  }
}

window.onload = () => {
  const app = new App();
  app.init();
  //   this.mediaPipe.addEventListener('setup', () => {
  //   console.log(mediaPipe.video)
  // })
};

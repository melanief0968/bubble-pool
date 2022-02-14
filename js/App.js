const PICTURE_COUNTDOWN = 2;

const mediaPipe = new MediaPipeClient();
window.mediaPipe = mediaPipe; // global object mediaPipe

class App {
  constructor() {}
  async init({ canvas, video, pixelDensity = 1 }) {
    // this.video_wrapper = document.getElementById("video");
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");

    this.smoother = new MediaPipeSmoothPose({
      dampAmount: 0.1, // range ~1-10 [0 is fastest]
    });

    // console.dir(this.video);
    this.pixelDensity = pixelDensity;
    this.video = video;
    // const { innerWidth, innerHeight } = window;

    // this.video.width = innerWidth;
    // this.video.height = innerHeight;
    this.canvas.width = video.width * pixelDensity;
    this.canvas.height = video.height * pixelDensity;

    // this.video_wrapper.appendChild(this.video);
    // this.video_wrapper.appendChild(this.canvas);

    this.frameCount = 0;
    this.circles = [];
    this.texts = [];
    this.dataURLs = [];
    this.cachedPictures = {};
    this.poses = [];
    // this.mediaPipe = new MediaPipeClient()
    // this.loadPoseNetModel();
    // this.loadFaceDetection();
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
    this.changeState(PICTURE_COUNTDOWN);
    this.sound;

    this.isReady = true;
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

  // loadPoseNetModel() {
  //   this.poseNet = ml5.poseNet(this.video, this.modelLoaded.bind(this));
  // }
  // modelLoaded() {
  //   console.log("model loaded");
  //   // this.isReady = true;
  //   this.draw();
  //   this.poseNet.on("pose", (results) => {
  // if (!this.person && results && results[0])
  //   this.person = new Person(results[0].pose.keypoints, this.MATTER);
  // this.poses = results;
  //   if (this.person == 1 && results && results[1])
  //   this.person2 = new Person(results[1].pose.keypoints, this.MATTER);
  // this.poses = results;
  //   });
  // }

  onPose(pose) {
    this.smoother.target(pose);

    if (!this.person && pose) {
      const { width, height } = this.canvas;
      this.person = new Person({ pose, MATTER: this.MATTER, width, height });
      this.person.update(pose);
    }

    this.poses.length = 0; //? clear array
    if (pose) this.poses.push(pose);
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

  normalizeDensity(n) {
    return n / this.pixelDensity;
  }

  takeAndSendFace(boundary) {
    const picIndex = Date.now();

    const { min, max } = boundary.body.bounds;

    const margin = 10 * this.pixelDensity;

    const minX = this.normalizeDensity(min.x - margin);
    const minY = this.normalizeDensity(min.y - margin);
    const maxX = this.normalizeDensity(max.x + margin);
    const maxY = this.normalizeDensity(max.y + margin);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = maxX - minX;
    const height = maxY - minY;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(this.video, minX, minY, width, height, 0, 0, width, height);

    const imageString = canvas.toDataURL("image/jpeg", 0.8);
    // // const image = new Image();
    // // image.src = imageString;
    // console.log(imageString);

      
    SEND_MESSAGE("PICTURES-GESTS/PICTURES-STORAGE/" + picIndex, imageString);
  }

  showFaceDetection() {
    // if (this.faceDetections) {
    //   if (this.faceDetections.length > 0) {
    //     for (let i = 0; i < this.faceDetections.length; i += 1) {
    //       const alignedRect = this.faceDetections[i].alignedRect;
    //       const boxX = alignedRect._box._x;
    //       const boxY = alignedRect._box._y;
    //       const boxWidth = alignedRect._box._width;
    //       const boxHeight = alignedRect._box._height;
    //       let biggerPhotoX = boxWidth / 4;
    //       let biggerPhotoY = boxHeight / 4;
    //       let x = boxX - biggerPhotoX;
    //       let y = boxY;
    //       let w = boxWidth + 2 * biggerPhotoX;
    //       let h = boxHeight;
    //       this.detectFaces.splice(0, this.detectFaces.length);
    //       this.detectFaces.push(new FaceDetection(x, y, w, h));
    //       this.detectFaces.forEach((face) => face.showFaceDetection(this.ctx));
    //       //!
    //       //*
    //       //?
    //     }
    //   }
    // }
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
          this.person.boundaries[NOSE].body
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
    if (this.poses.length === 0) return;
    this.faceDetectionDuration++;
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
          // this.detectFaces.forEach((face) => {
          this.takeAndSendFace(this.person.boundaries[NOSE]);
          // });
          // this.floor = new Ground();
          // this.floor.groundLimit(this.MATTER);
          //facedetection duration = 0
        }
        break;
    }
  }

  draw() {
    this.ctx.fillStyle = "lightgrey";

    const smoothedPose = this.smoother.smoothDamp();

    // if (!this.person && smoothedPose)
    // this.person = new Person(smoothedPose, this.MATTER);

    const { width, height } = this.canvas;

    // this.ctx.fillRect(0, 0, width, height);
    this.ctx.drawImage(this.video, 0, 0, width, height);
    this.MATTER.Engine.update(this.MATTER.engine); //! was in a state before
    // console.log(this.MATTER.engine.world.bodies.length);

    switch (this.state) {
      case PICTURE_COUNTDOWN:
        this.checkIfThereIsSomeone();
        // this.showFaceDetection();
        this.rainBubbles();
        this.drawBubbles();
        if (this.faceDetectionDuration >= 150 && this.person) {
          this.faceDetectionDuration = 0;
          this.changeState(3);
        }

        break;
      case 3:
        console.log("STATE3");
        this.rainBubbles();
        this.drawBubbles();
        //person

        if (this.person) {
          this.person.update(smoothedPose);
          this.person.show(this.ctx);
        }



        if (this.poses.length === 0) {
          this.counter++;

          if (this.counter >= 200) {
            console.log("NOBODY");
            this.clearAllElement();
            this.clearPersonPhysic();
            this.changeState(PICTURE_COUNTDOWN);
          }
        } else {
          this.counter = 0;
        }
        // if (this.person) {
        //   if (this.poses.length > 0) {
        //     this.counter = 0;
        //     this.person.update(smoothedPose);
        //   }

        //   this.person.show(this.ctx);

        //   if (this.poses.length <= 0) {
        //     this.counter++;
        //     if (this.counter >= 200) {
        //       console.log("NOBODY")
        //       this.clearAllElement();
        //       this.clearPersonPhysic();
        //       this.counter = 0;
        //       this.changeState(PICTURE_COUNTDOWN);
        //     }
        //   }
        // }

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
      this.person.destroy()
      this.person = null;
    }
  }
}

window.onload = () => {
  const app = new App();

  mediaPipe.addEventListener("setup", () => {
    const video = mediaPipe.video;
    const canvas = document.querySelector(".main-canvas");

    app.init({ canvas, video, pixelDensity: 2 });
    app.draw();
  });

  mediaPipe.addEventListener("pose", (event) => {
    // console.log(event.data.skeleton);
    app.onPose(event.data.skeleton);
  });
};

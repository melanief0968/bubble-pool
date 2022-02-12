class Ground {
  constructor() {
    this.heightSize = 8;
  }
  groundLimit(MATTER) {
    var options = {
      isStatic: true,
    };
    this.ground = MATTER.Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight,
      window.innerWidth,
      this.heightSize,
      options
    );
    this.ground2 = MATTER.Bodies.rectangle(
      0,
      window.innerHeight,
      this.heightSize,
      window.innerHeight / 2,
      options
    );
    this.ground3 = MATTER.Bodies.rectangle(
      window.innerWidth,
      window.innerHeight,
      this.heightSize,
      window.innerHeight / 2,
      options
    );
    MATTER.World.add(MATTER.engine.world, this.ground);
    MATTER.World.add(MATTER.engine.world, this.ground2);
    MATTER.World.add(MATTER.engine.world, this.ground3);
  }
  removeFromWorld(MATTER) {
    MATTER.World.remove(MATTER.engine.world, this.ground);
    // console.log(this.MATTER.engine.world.bodies.length);
    // console.log("removed", this.MATTER.engine.world.bodies.length);
  }
}

// In this simple problem the world includes both the environment and the robot
// but in most problems the environment and world would be separate
class World {
    constructor(numFloors, numRooms) {
        this.numFloors = numFloors;
        this.numRooms = numRooms;
        this.location = Object.seal({floor: 0, room: 0});
        this.lastDirection = Object.seal({vertical: 'LEFT', horizontal: 'UP'});
        this.lastMove = 'UP';

        this.carpets = [];
        for (let i = 0; i < numFloors; i++) {
            this.carpets.push([]);
            for (let j = 0; j < numRooms; j++) {
                this.carpets[i].push({dirty: false});
            }
        }
    }
    
    markCarpetDirty(floor, room) {
        this.carpets[floor][room].dirty = true;
    }

    markCarpetClean(floor, room) {
        this.carpets[floor][room].dirty = false;
    }

    goForward(position, maxPosition) {
        return position === maxPosition ? position : ++position;
    }

    goBackward(position) {
        return position === 0 ? position : --position;
    }

    simulate(action) {
        this.lastMove = action === 'SUCK' ? this.lastMove : action;

        switch(action) {
            case 'SUCK':
                this.markCarpetClean(this.location.floor, this.location.room);
                break;
            case 'LEFT':
                this.lastDirection.horizontal = action;
                this.location.room = this.goBackward(this.location.room);
                break;
            case 'RIGHT':
                this.lastDirection.horizontal = action;
                this.location.room = this.goForward(this.location.room, this.numRooms - 1);
                break;
            case 'UP':
                this.lastDirection.vertical = action;
                this.location.floor = this.goBackward(this.location.floor);
                break;
            case 'DOWN':
                this.lastDirection.vertical = action;
                this.location.floor = this.goForward(this.location.floor, this.numFloors - 1);
                break;
        }

        return action;
    }
}


// Rules are defined in code
function reflexVacuumAgent(world) {
    const {numFloors, numRooms, lastDirection, lastMove} = world;
    const {floor, room} = world.location;
    
    const itsMostRight      = room === numRooms - 1;
    const itsMostLeft       = room === 0;
    const itsOnEdge         = itsMostLeft || itsMostRight;
    const itsInMiddleRooms  = !itsOnEdge;

    const itsAtBottom       = floor === numFloors - 1;
    const itsAtTop          = floor === 0;
    const itsInMiddleFloors = !itsAtTop && !itsAtBottom;

    const lastMoveWasHorizontal = lastMove === 'LEFT' || lastMove === 'RIGHT';

    if (world.carpets[floor][room].dirty)                                              { return 'SUCK'; }
    else if (numFloors > 1 && itsOnEdge && itsAtTop && lastMove !== 'UP')              { return 'DOWN'; }
    else if (numFloors > 1 && itsOnEdge && itsAtBottom && lastMove !== 'DOWN')         { return 'UP'; }
    else if (numFloors > 1 && itsOnEdge && itsInMiddleFloors && lastMoveWasHorizontal) { return lastDirection.vertical; }
    else if (numRooms > 1 && itsMostRight)                                             { return 'LEFT'; }
    else if (numRooms > 1 && itsMostLeft)                                              { return 'RIGHT'; }
    else if (numRooms > 1 && itsInMiddleRooms)                                         { return lastDirection.horizontal; }
}
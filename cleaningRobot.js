// In this simple problem the world includes both the environment and the robot
// but in most problems the environment and world would be separate
class World {
    constructor(numFloors, numRooms) {
        this.numFloors = numFloors;
        this.numRooms = numRooms;
        this.location = {floor: 0, room: 0};
        this.lastDirection = {vertical: 'LEFT', horizontal: 'TOP'};
        this.lastMove = 'TOP';

        this.carpets = [];
        for (let i = 0; i < numFloors; i++) {
            let floor = [];
            for (let j = 0; j < numRooms; j++) {
                floor.push({dirty: false});
            }
            this.carpets.push(floor);
        }
    }
    
    markCarpetDirty(floor, room) {
        this.carpets[floor][room].dirty = true;
    }

    markCarpetClean(floor, room) {
        this.carpets[floor][room].dirty = false;
    }

    goForward(position, maxPosition) {
        return position === maxPosition-1 ? position : ++position;
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
                this.location.room = this.goForward(this.location.room, this.numRooms);
                break;
            case 'TOP':
                this.lastDirection.vertical = action;
                this.location.floor = this.goBackward(this.location.floor);
                break;
            case 'BOTTOM':
                this.lastDirection.vertical = action;
                this.location.floor = this.goForward(this.location.floor, this.numFloors);
                break;
        }

        return action;
    }
}


// Rules are defined in code
function reflexVacuumAgent(world) {
    const {numFloors, numRooms, lastDirection, lastMove} = world;
    const {floor, room} = world.location;
    
    const itsMostRight = room === numRooms - 1;
    const itsMostLeft = room === 0;
    const itsOnEdge = itsMostLeft || itsMostRight;
    const itsInMiddleRooms = !itsOnEdge;

    const itsAtBottom = floor === numFloors - 1;
    const itsAtTop = floor === 0;
    const itsInMiddleFloors = !itsAtTop && !itsAtBottom;

    const lastMoveWasHorizontal = lastMove === 'LEFT' || lastMove === 'RIGHT';

    if (world.carpets[floor][room].dirty)                                              { return 'SUCK'; }
    else if (numFloors > 1 && itsOnEdge && itsAtTop && lastMove !== 'TOP')             { return 'BOTTOM'; }
    else if (numFloors > 1 && itsOnEdge && itsAtBottom && lastMove !== 'BOTTOM')       { return 'TOP'; }
    else if (numFloors > 1 && itsOnEdge && itsInMiddleFloors && lastMoveWasHorizontal) { return lastDirection.vertical; }
    else if (numRooms > 1 && itsMostRight)                                             { return 'LEFT'; }
    else if (numRooms > 1 && itsMostLeft)                                              { return 'RIGHT'; }
    else if (numRooms > 1 && itsInMiddleRooms)                                         { return lastDirection.horizontal; }
}

// Rules are defined in data, in a table indexed by [location][dirty]
function tableVacuumAgent(world, table) {
    const { floor, room } = world.location;
    let dirty = world.carpets[floor][room].dirty ? 1 : 0;
    return table[floor][room][dirty];
}

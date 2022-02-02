/* The general structure is to put the AI code in xyz.js and the visualization
   code in c_xyz.js. Create a diagram object that contains all the information
   needed to draw the diagram, including references to the environment&agents.
   Then use a draw function to update the visualization to match the data in
   the environment & agent objects. Use a separate function if possible for 
   controlling the visualization (whether through interaction or animation). 
   Chapter 2 has minimal AI and is mostly animations. */
const SIZE = 100;
const PADDING = 50;
const TEXT_HEIGHT = 85;
const colors = {
    perceptBackground: 'hsl(240,10%,85%)',
    perceptHighlight: 'hsl(60,100%,90%)',
    actionBackground: 'hsl(0,0%,100%)',
    actionHighlight: 'hsl(150,50%,80%)'
};


/* Create a diagram object that includes the world (model) and the svg
   elements (view) */
function makeDiagram(selector, numFloors, numRooms) {
    let diagram = {}, world = new World(numFloors, numRooms);
    diagram.world = world;

    diagram.xPosition = (roomNumber) => PADDING + roomNumber * SIZE * 1.5;
    diagram.yPosition = (floorNumber) => PADDING/2 + (SIZE + TEXT_HEIGHT) * (floorNumber + 1);

    diagram.root = d3.select(selector);
    diagram.root.selectAll("*").remove();
    diagram.root
        .attr('width', (diagram.xPosition(numRooms - 1) + SIZE + PADDING) + 'px')
        .attr('height', (diagram.yPosition(numFloors - 1) + SIZE) + 'px');

    diagram.robot = diagram.root.append('g')
        .attr('class', 'robot')
        .style('transform', `translate(${diagram.xPosition(world.location.room)}px,${diagram.yPosition(world.location.floor) - SIZE*1.1}px)`);
    diagram.robot.append('rect')
        .attr('width', SIZE)
        .attr('height', SIZE)
        .attr('fill', 'hsl(120,25%,50%)');
    diagram.perceptText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -25)
        .attr('text-anchor', 'middle');
    diagram.actionText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -10)
        .attr('text-anchor', 'middle');

    diagram.carpets = [];
    for (let floorNumber = 0; floorNumber < world.numFloors; floorNumber++) {
        let floor = [];
        for (let roomNumber = 0; roomNumber < world.numRooms; roomNumber++) {
            let room =
                diagram.root.append('rect')
                .attr('class', 'clean floor') // for css
                .attr('x', diagram.xPosition(roomNumber))
                .attr('y', diagram.yPosition(floorNumber))
                .attr('width', SIZE)
                .attr('height', SIZE/4)
                .attr('stroke', 'black')
                .on('click', function() {
                    world.markCarpetDirty(floorNumber, roomNumber);
                    diagram.carpets[floorNumber][roomNumber].attr('class', 'dirty floor');
                });
            floor.push(room);
        }
        diagram.carpets.push(floor);
    }
    return diagram;
}


/* Rendering functions read from the state of the world (diagram.world) 
   and write to the state of the diagram (diagram.*). For most diagrams
   we only need one render function. For the vacuum cleaner example, to
   support the different styles (reader driven, agent driven) and the
   animation (agent perceives world, then pauses, then agent acts) I've
   broken up the render function into several. */

function renderWorld(diagram) {
    for (let floorNumber = 0; floorNumber < diagram.world.numFloors; floorNumber++) {
        for (let roomNumber = 0; roomNumber < diagram.world.numRooms; roomNumber++) {
            let itsDirty = diagram.world.carpets[floorNumber][roomNumber].dirty;
            diagram.carpets[floorNumber][roomNumber].attr('class', itsDirty ? 'dirty floor' : 'clean floor');
        }
    }
    diagram.robot.style('transform', `translate(${diagram.xPosition(diagram.world.location.room)}px,${diagram.yPosition(diagram.world.location.floor) - SIZE*1.1}px)`);
}

function renderAgentPercept(diagram, dirty) {
    let perceptLabel = {false: "It's clean", true: "It's dirty"}[dirty];
    diagram.perceptText.text(perceptLabel);
}

function renderAgentAction(diagram, action) {
    let actionLabel = {
        null: 'Waiting',
        'SUCK': 'Vacuuming',
        'LEFT': 'Going left',
        'RIGHT': 'Going right',
        'UP': 'Going up',
        'DOWN': 'Going down'
    };
    diagram.actionText.text(actionLabel[action]);
}


/* Control the diagram by letting the AI agent choose the action. This
   controller is simple. Every STEP_TIME_MS milliseconds choose an
   action, simulate the action in the world, and draw the action on
   the page. */

const STEP_TIME_MS = 2500;
function makeAgentControlledDiagram(numFloors, numRooms) {
    let diagram = makeDiagram('#agent-controlled-diagram svg', numFloors, numRooms);

    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.carpets[location.floor][location.room].dirty;
        let action = reflexVacuumAgent(diagram.world);
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);
}


/* Control the diagram by letting the reader choose the action. This
   diagram is tricky.
 
   1. If there's an animation already playing and the reader chooses
      an action then *wait* for the animation to finish playing. While
      waiting the reader may choose a different action. Replace the
      previously chosen action with the new one. (An alternative
      design would be to queue up all the actions.)
   2. If there's not an animation already playing then when the reader
      chooses an action then run it right away, without waiting.
   3. Show the connection between the percept and the resulting action
      by highlighting the percepts in the accompanying table, pausing,
      and then highlighting the action.
*/
function makeReaderControlledDiagram(numFloors, numRooms) {
    let diagram = makeDiagram('#reader-controlled-diagram svg', numFloors, numRooms);
    let nextAction = null;
    let animating = false; // either false or a setTimeout intervalID

    function makeButton({action, label, left, top=0, height=24, width=100, className='btn-default'}) {
        let button = d3.select('#reader-controlled-diagram .buttons')
            .append('button')
            .attr('class', 'btn ' + className)
            .style('position', 'absolute')
            .style('left', left + 'px')
            .style('top', (top + 10) + 'px')
            .style('width', width + 'px')
            .style('height', height + 'px')
            .style('line-height', height + 'px')
            .style('font-size', '12px')
            .style('padding', '0')
            .text(label)
            .on('click', () => {
                setAction(action);
                updateButtons();
            });
        button.action = action;
        return button;
    }

    let buttons = [
        makeButton({action: 'SUCK', label:'Vacuum', left: 50, height: 48, className: 'btn-primary'}),
        makeButton({action: 'LEFT', label:'Move left', left: 200, top: 12}),
        makeButton({action: 'RIGHT', label:'Move right', left: 400, top: 12}),
        makeButton({action: 'UP', label:'Move up', left: 300}),
        makeButton({action: 'DOWN', label:'Move down', left: 300, top: 24})
    ];

    function updateButtons() {
        for (let button of buttons) {
            button.classed('btn-warning', button.action === nextAction);
        }
    }

    function setAction(action) {
        nextAction = action;
        if (!animating) { update(); }
    }
    
    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.carpets[location.floor][location.room].dirty;
        if (nextAction !== null) {
            diagram.world.simulate(nextAction);
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, nextAction);
            nextAction = null;
            updateButtons();
            animating = setTimeout(update, STEP_TIME_MS);
        } else {
            animating = false;
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, null);
        }
    }
}

function updateDiagram() {
    const numFloors = parseInt(d3.select("#numFloors").node().value);
    const numRooms = parseInt(d3.select("#numRooms").node().value);
    makeAgentControlledDiagram(numFloors, numRooms);
    makeReaderControlledDiagram(numFloors, numRooms);
}

updateDiagram();
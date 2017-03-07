'use strict';
 // client === {clientName, phone, email, companyName, address, city, state, zip, 
 //             projectName, projectAddress, projectContact, projectDescription}

 // survey === [
 //   area === {name, fixtures}
 //   fixture === {name, label, replacements, notes, icon, savedPhotos}
 //   replacement === {color, count, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
 //   tally === {tally0, tally1, tally2, tally3}
 // ]


const getWatts = replacement => replacement.label.split('(')[1].split(')')[0].split(' ')[0];


const getLamps = replacement => {
  const lampStr = replacement.name.split(',')[1];
  if (lampStr) {
    return lampStr.trim().split(' ')[0];
  } else {
    return '1';
  }
};


const replacementRows = (name, fixture) => {
  const rows = fixture.replacements.reduce((prevRepl, currRepl) => {
    const watts = getWatts(currRepl);
    const lamps = getLamps(currRepl);
    const row = `${name}, ${fixture.label}, ${watts}, ${currRepl.count}, ${lamps}`;
    const rowWithNewline = row + '\n';
    prevRepl += rowWithNewline;
    return prevRepl;
  }, '');
  return rows;
};


const areaRows = area => {
  const rows = area.fixtures.reduce((prevFix, currFix) => {
    prevFix += replacementRows(area.name, currFix);
    return prevFix;
  }, '');
  return rows;
};


const makeCSV = areas => {
  const csv = areas.reduce((prevArea, currArea) => {
    prevArea += areaRows(currArea);
    return prevArea;
  }, 'Room/Area, Fixture Type, Watts, Fixture Qty, Lamp Qty\n');
  return csv;
};




module.exports = {

	csvFileBuffer(survey) {
    const csv = makeCSV(survey);
    return new Buffer(csv);
  }
};
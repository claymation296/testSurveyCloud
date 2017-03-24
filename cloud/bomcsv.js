'use strict';
 // client === {clientName, phone, email, companyName, address, city, state, zip, 
 //             projectName, projectAddress, projectContact, projectDescription}

 // example
        // bom: {
          //   type: Object,
          //   value: {
          //     areas: {
          //       'office': {
          //         fixtures: {
          //           '8in_can': true,
          //           '2x4_troffer': true
          //         },
          //         photos: {
          //           '144443843_433': true
          //         }
          //       },
          //       'break_room': {
          //         fixtures: {
          //           '2x4_troffer': true
          //         },
          //         photos: {
          //           '14476453_349': true
          //         }
          //       },
          //       'main_entrance': {
          //         fixtures: {
          //           '8in_can': true
          //         },
          //         photos: {
          //           '14473455_146': true
          //         }
          //       }
          //     },
          //     fixtures: {
          //       '8in_can': {
          //         'office': {
          //           base: 'e26',
          //           catagory: 'can',
          //           color: 'white',
          //           contactors: '',
          //           controls: {
          //             'dimmer': true,
          //             'light': false,
          //             'motion': false,
          //             'timer': false
          //           },
          //           days: '5',
          //           emergency: '',
          //           height: '8',
          //           hours: '12',
          //           icon: 'canLight',
          //           kelvin: '4500',
          //           label: '8 inch Can',
          //           lamps: 1,
          //           mount: '',
          //           notes: '',
          //           photos: {
          //             '144443843_433': true
          //           },
          //           qty: 7,
          //           type: '8in',
          //           volts: '120',
          //           watts: '20'
          //         },
          //         'main_entrance': {
          //           base: 'pl',
          //           catagory: 'can',
          //           color: 'white',
          //           contactors: '',
          //           controls: {
          //             'dimmer': false,
          //             'light': false,
          //             'motion': false,
          //             'timer': true
          //           },
          //           days: '7',
          //           emergency: '',
          //           height: '12',
          //           hours: '8',
          //           icon: 'canLight',
          //           label: '8 inch Can',
          //           kelvin: '5000',
          //           lamps: 2,
          //           mount: '',
          //           notes: '',
          //           photos: {
          //             '144475694_394': true
          //           },
          //           qty: 4,
          //           type: '8in',
          //           volts: '120',
          //           watts: '32'
          //         }
          //       },
          //       '2x4_troffer': {
          //         'break_room': {
          //           base: 'tombstone',
          //           catagory: 'troffer',
          //           color: 'white',
          //           contactors: '',
          //           controls: {
          //             'dimmer': false,
          //             'light': false,
          //             'motion': true,
          //             'timer': false
          //           },
          //           days: '7',
          //           emergency: '',
          //           height: '10',
          //           hours: '14',
          //           icon: 'fluorescent',
          //           kelvin: '4500',
          //           label: '2x4 Troffer',
          //           lamps: 3,
          //           mount: '',
          //           notes: '',
          //           photos: {
          //             '14476453_349': true
          //           },
          //           qty: 4,
          //           type: '2x4',
          //           volts: '208',
          //           watts: '24'
          //         },
          //         'office': {
          //           base: 'tombstone',
          //           catagory: 'troffer',
          //           color: 'white',
          //           contactors: '',
          //           controls: {
          //             'dimmer': false,
          //             'light': true,
          //             'motion': false,
          //             'timer': true
          //           },
          //           days: '7',
          //           emergency: '',
          //           height: '10',
          //           hours: '12',
          //           icon: 'fluorescent',
          //           kelvin: '4500',
          //           label: '2x4 Troffer',
          //           lamps: 2,
          //           mount: '',
          //           notes: '',
          //           photos: {
          //             '14473455_146': true
          //           },
          //           qty: 6,
          //           type: '2x4',
          //           volts: '208',
          //           watts: '28'
          //         }
          //       }
          //     },
          //     photos: {
          //       '144443843_433': {
          //         area: 'office',
          //         fixture: '8in_can',
          //         orientation: 0,
          //         placeholder: '',
          //         savedUrl: ''
          //       },
          //       '144475694_394': {
          //         area: 'main_entrance',
          //         fixture: '8in_can',
          //         orientation: 6,
          //         placeholder: '',
          //         savedUrl: ''
          //       },
          //       '14476453_349': {
          //         area: 'break_room',
          //         fixture: '2x4_troffer',
          //         orientation: 0,
          //         placeholder: '',
          //         savedUrl: ''
          //       },
          //       '14473455_146': {
          //         area: 'office',
          //         fixture: '2x4_troffer',
          //         orientation: 0,
          //         placeholder: '',
          //         savedUrl: ''
          //       }
          //     }              
          //   }
          // }


const firstRow = 'Area, Fixture Type, Fixture Qty, Fixture Color, Lamp Qty, Kelvin, Watts, Volts, Base, Mount, Height, Hours, Days, Contactors, Emergency, Dimmer, Timer, Light Sensor, Motion Sensor, Photos, Notes\n';


const nameFromKey = key => key.split('_').join(' ');


const fixtureRow = (areaKey, fixKey, fixture) => {
  const area = nameFromKey(areaKey);
  const type = nameFromKey(fixKey);
  const {qty, color, lamps, kelvin, watts, volts, base, mount, height, hours, days, contactors, emergency, dimmer, timer, ambient, motion, photos, notes} = fixture;

  let urls = '';

  if (photos && typeof photos === 'object') {
    const photoKeys = Object.keys(photos);
    urls = photoKeys.reduce((prevStr, currPhotoKey) => {
      if (!photos[currPhotoKey].savedUrl) { return prevStr; }
      prevStr += `${photos[currPhotoKey].savedUrl}_`;
      return prevStr;
    }, '');
  }
  
  const dataStr = `${area}, ${type}, ${qty}, ${color}, ${lamps}, ${kelvin}, ${watts}, ${volts}, ${base}, ${mount}, ${height}, ${hours}, ${days}, ${contactors}, ${emergency}, ${dimmer}, ${timer}, ${ambient}, ${motion}, ${urls}, ${notes}`;
  const row     = dataStr + '\n';

  return row;
};


const areaRows = (bom, area) => {
  const fixtureKeys = Object.keys(bom.areas[area].fixtures);

  const rows = fixtureKeys.reduce((prevRow, currFixKey) => {
    prevRow += fixtureRow(area, currFixKey, bom.fixtures[currFixKey][area]);
    return prevRow;
  }, '');
  return rows;
};


const makeCSV = bom => {
  const areaKeys = Object.keys(bom.areas);

  const csv = areaKeys.reduce((prevStr, currAreaName) => {
    prevStr += areaRows(bom, currAreaName);
    return prevStr;
  }, firstRow);

  return csv;
};




module.exports = {

	csvFileBuffer(bom) {
    const csv = makeCSV(bom);
    return new Buffer(csv);
  }
};
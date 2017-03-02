'use strict';

var jsPDF  = require('./jspdf.debug.js');
var images = require('./images.js');



// setup pdf and email generator instances
var doc = new jsPDF();
// todays date with the day of the week cut out of the date object
var date = new Date().toLocaleDateString().split(',').slice(1).join().trim();
															
var teuContactString = 'TEU Services, Inc. \n' +
                       '1454 Sidney Baker \n' +
                       'Kerrville, TX 78028 \n\n' +
                       '866-512-7770 \n' +
                       'www.teuservices.com \n' +
                       'rq@teuservices.com';

var shortTeuContactString = 'TEU Services, Inc. \n' +
                            '866-512-7770 \n' +
                            'www.teuservices.com \n' +
                            'rq@teuservices.com';

var coverLetterMessage = 'Thank you for your interest in REDAAP, for allowing us to conduct a lighting Survey and provide you \n' + 
                         'with a Proposal, for free. Services like, \"Lighting as a Service\", don\'t always seem to make sense at \n' + 
                         'first. Remember when we all used to purchase cassette tapes and movies on DVD? Now we listen to \n' + 
                         'music as a service and watch movies covered by a monthly service fee. CD sales and DVD sales are \n' + 
                         'going away, mobile phones are offered on monthly service plans now. Lighting as a Service means no \n' + 
                         'more trips to the hardware store to buy light bulbs.';


var redaapBasics = 'REDAAP is a service that comes with no upfront \n' +
                   'cost, no need to buy and test products and \n' + 
                   'best of all, no hassles. Our low cost Service Fee \n' +
                   'includes';
var basicsPoint1 = 'Removing and disposing of the old lamps \n' + 
                   'and fixtures that have mercury and other \n' + 
                   'toxic chemicals';
var basicsPoint2 = 'Installing new LED lighting that will actually \n' + 
                   'enhance your business, and best of all';
var basicsPoint3 = 'LED lighting that uses 50% to 92% less \n' + 
                   'electricity than your existing lights';
var basicsPoint4 = 'That means REDAAP actually pays for \n' + 
                   'itself by reducing electric and \n' + 
                   'maintenance expenses';

 
var serviceBody = 'You already know about LED lighting and how \n' + 
                  'energy smart it is. REDAAP allows you to \n' + 
                  'enjoy LED lights as a Service without any of \n' + 
                  'the risk. \n\n' + 
                  'Please take a few minutes to review our \n' +
                  'Proposal and don\'t hesitate to call us with \n' + 
                  'your questions. We are looking forward to \n' + 
                  'serving you.';

// fine print at the bottom of the last page
var fine = 'This Proposal includes converting existing lighting listed above to LED lighting \n' + 
           'and providing lighting maintenance services at the Client\'s property (\“Project\”). \n' + 
           'Client acknowledges this Proposal is subject to the Terms of Service and further \n' + 
           'acknowledges they have received a copy of the Terms of Service and have \n' + 
           'reviewed and have approved and will abide by the Terms of Service. REDAAP \n' + 
           'Services will commence within 21 days from approval and acceptance. The first \n' + 
           'month\'s bill will become due 45 days from signing this Proposal.';

var requirements = 'Approval Requirements: Credit App Signed & Entity Organizational Documents';
	

var makeFirstNameAllCaps = function(fullName) {
  var firstName = fullName.split(' ')[0];
  var makeAllCaps = firstName.split('').map(function(character) {
    return character.toUpperCase();
  }).join('');
  return makeAllCaps;
}; 

// add spaces before numbers in order to fake right justifying
var rightJustifyNumber = function(num, prefix) {
  prefix = prefix || '';
  var string = '';
  var numString = prefix + num.toString();
  if (num < 10) {
    string += ' ' + ' ' + ' ' + ' ' + ' ' + ' ';
  } else if (num < 100) {
    string += ' ' + ' ' + ' ' + ' ';
  } else if (num < 1000) {
    string += ' ' + ' ';
  }
  return string += numString;
};

// add to the default x position to fake centering a number
var centeredNum = function(num, startX) {
  var newX = startX;
  if (num < 10) {
    newX += 6;
  } else if (num < 100) {
    newX += 4;
  } else if (num < 1000) {
    newX += 2;
  } else if (num < 10000) {
    return newX;
  } else if (num < 100000) {
    newX += -2;
  } else if (num < 1000000) {
    newX += -4;
  } else if (num < 10000000) {
    newX += -6;
  }
  return newX;
};

var sumTallies = function(tallies) {
  var sum = tallies.reduce(function(prev, curr) {
    var currToNumber = curr ? Number(curr) : 0;
    return prev + currToNumber;
  }, 0);
  return sum;
};

var truncate = function(str) {
  var maxLength = 20;
  var truncated = str.length > maxLength ? (str.slice(0, maxLength - 3) + '...') : str;
  return truncated;
};

var setNormalFont = function(size) {
  var fontSize = size || 11;
  doc.addFont('Arial', 'Arial', 'normal');
  doc.setFont('Arial', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(33, 33, 33);
};

var setItalicFont = function(size) {
  var fontSize = size || 11;
  doc.addFont('Arial', 'Arial', 'italic');
  doc.setFont('Arial', 'italic');
  doc.setFontSize(fontSize);
  doc.setTextColor(33, 33, 33);
};

var setBoldFont = function(size) {
  var fontSize = size || 11;
  doc.addFont('Arial', 'Arial', 'bold');
  doc.setFont('Arial', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(33, 33, 33);
};

var addLogos = function() {
  // params === image file, image type, x, y, width, height
  doc.addImage(images.redaapLogo, 'jpg', 2, 9, 54, 11);
  doc.addImage(images.poweredByTEU, 'jpg', 142, 285, 71, 10);
};

var addProposal = function(order) {
  setNormalFont(33);
  doc.setTextColor(102, 102, 102);
  doc.text(146, 16, 'PROPOSAL');
  doc.setFontSize(9);
  doc.text(146, 21, order);
};

var makeTableCols = function(y) {
  setBoldFont();
  doc.text(7, y, 'Room / Area');
  doc.text(65, y, 'Existing Fixtures');
  doc.text(138, y, 'LED Upgrade');
  doc.text(183, y, 'Fixture Count');

  doc.setLineWidth(0.5);
  doc.setDrawColor(33, 33, 33);
  // line takes the points at either end
  doc.line(0, y + 3, 210, y + 3);
  // tick marks
  doc.line(40, y + 3, 40, y + 6);
  doc.line(122, y + 3, 122, y + 6);
  doc.line(180, y + 3, 180, y + 6);
};


// function with side effects that generates the table of fixtures
// while keeping track of the page number as well as the available
// space on each page
var makeTable = function(survey, order, monthly, tax) {
  setNormalFont();

  var lineCount = 1;
  var startOfTableY = 108;
  var currentY = startOfTableY;
  // need two page height thresholds
  // the first indicates the height at which the footer will no longer fit with the table
  // on the same page 
  // the other threshold measures when the table has reached the bottom of the current page
  var footerThreshold = 210;
  var pageIsFullThreshold = 258;
  var pushFooterToNewPage = false;
  // keep track of how many pages are being generated
  var page = 1;
  // simulate a new line operation
  function nextLine() {
    // spacing down 10mm
    var newLineSpacing = 10;
    lineCount += 1;
    currentY += newLineSpacing;
  }
  // handle adding a page based on the size of the table
  function nextPage() {
    doc.addPage();
    page += 1;
    lineCount = 1;
    currentY = 45;

    addLogos();
    addProposal(order);
  }
  // add lines of text to build a table
  function addRow(row) {
    setNormalFont();
    if (row.area) {
    	doc.text(5, currentY, truncate(row.area));
    }
    if (row.custom) {
      doc.text(45, currentY, 'Custom Product $' + row.customProduct);
      doc.text(126, currentY, 'Custom Install $' + row.customInstall);
    } else {
      doc.text(45, currentY, row.fixture);
      doc.text(126, currentY, row.replacement);
    }
    doc.text(188, currentY, rightJustifyNumber(row.count));
  }

  function measurePageLayout() {
    if (currentY > pageIsFullThreshold) {
      // start a new page
      pushFooterToNewPage = false;
      nextPage();
    } else if (currentY >= footerThreshold) {
      // push footer to next page
      pushFooterToNewPage = true;
      nextLine();
    } else {
      if (lineCount === 1) {
        makeTableCols(currentY - 12);
      }
      // add another row
      pushFooterToNewPage = false;
      nextLine();
    }
  }

  function addBottomDividerToTable() {
    doc.setLineWidth(0.35);
    doc.setDrawColor(153, 153, 153);
    // line takes the points at either end
    doc.line(10, currentY, 198, currentY);
  }
  // add the fine print strings to the pdf
  function addFinePrint() {
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text(0, 235, fine);
    setItalicFont(9);
    doc.text(0, 265, requirements);
  }

  function addAcceptance() {
    doc.setLineWidth(0.35);
    doc.setDrawColor(153, 153, 153);
    // line takes the points at either end
    doc.line(0, 280, 90, 280);
    doc.line(100, 280, 135, 280);

    setNormalFont(9);
    doc.text(0, 284, 'Acceptance of Proposal');
    doc.text(100, 284, 'Date');
  }

  function addQuotedPricing() {
    var serviceFee = monthly - tax;
    var serviceFeeStr = rightJustifyNumber(serviceFee, '$');
    var taxStr = rightJustifyNumber(tax, '$');
    var monthlyStr = rightJustifyNumber(Number(monthly).toFixed(2), '$');

    setBoldFont();
    doc.text(130, 235, 'Monthly Service Fee');
    doc.text(130, 242, 'Sales Tax');
    doc.text(130, 249, 'Monthly Total');

    setNormalFont();
    doc.text(180, 235, serviceFeeStr);
    doc.text(180, 242, taxStr);
    doc.text(180, 249, monthlyStr);
  }

  function addFooter() {
    addFinePrint();
    addAcceptance();
    addQuotedPricing();
  }

  function addInitial() {
    doc.setLineWidth(0.35);
    doc.setDrawColor(153, 153, 153);
    // line takes the points at either end
    doc.line(0, 280, 20, 280);

    setNormalFont(9);
    doc.text(0, 284, 'Initial');
  }

  function addContinued() {
    setNormalFont();
    doc.text(94, 284, 'continued...');
  }  
  // add the page number to each page
  function addPageNumbersInitialAndContinued() {
    var totalPages = doc.internal.getNumberOfPages();
    // first page is the cover page so start on page 2
    var proposalPages = totalPages - 1;

    for (var i = 1; i < totalPages; i += 1) {
      var pageNumber = 'page ' + i + ' of ' + proposalPages;

      setItalicFont(9);
      doc.setPage(i + 1);
      doc.text(0, 293, pageNumber);

      if (i < proposalPages) {
        addInitial();
        addContinued();
      }
    }
  }
  // will trigger the fine print to be correctly added
  // to the last page after all of the table elements
  // have been handled
  var lastArea = survey.length - 1;
  // iterate over the survey data to create the table 
  survey.forEach(function(area, index) {
    area.fixtures.forEach(function(fixture, fixtureIndex) {
      fixture.replacements.forEach(function(replacement, replacementIndex) {
        // addRow expects {areaName, fix, repl, count}
        // only add the areaName on the first row which is both indexes === 0
        var areaName = ((fixtureIndex === 0 && replacementIndex === 0) || lineCount === 1) ? area.name : '';
        var row = {
          area: areaName,
          count: replacement.count,
          fixture: fixture.name,
          replacement: replacement.name,
          custom: replacement.custom,
          customInstall: replacement.customInstall,
          customProduct: replacement.customProduct
        };
        
        addRow(row);
        measurePageLayout();
      });
    });
    // only include the bottom divider if the fine print is on the same page
    // as the last line of the table
    if (index === lastArea && !pushFooterToNewPage && lineCount !== 1) {
      addBottomDividerToTable();
    }
  });
  // catch case where there is more lines than fit on one page but less than
  // the max rows without a footer that will fit on a single page
  // so add another page to add the footer to
  if (pushFooterToNewPage) {
    nextPage();
  }

  addFooter();
  addPageNumbersInitialAndContinued();
};









    
module.exports.makePDF = function(data) {

	// data === {
  //    user: user,
  //    pricing: pricing,
  //    survey: survey,
  //    client: client,
  //    user: user,
  //    capture: capture,
  //    orderNum: orderNum
  //  };

  // pricing === {grandMonthly, term, totalQuantity, grandTax
  //   collection: [{
  //      inputFixture: el.fixture,
  //      fixture: el.existingFixture,
  //      inputReplacement: el.replacement,
  //      replacement: el.name,
  //      count: el.count,
  //      hardCostEach: hardCostEach,
  //      productSubEach: productSubEach,
  //      installSubEach: installSubEach,
  //      productOnlyTotal: productOnlyTotal,
  //      productOnlyTax: productOnlyTax,
  //      total: total,
  //      maintenance: maintenance,
  //      tax: tax,
  //      loan: loan,
  //      monthlyPayment: monthlyPayment
  //   }]}
 	var pricing = data.pricing;
  // survey === [
  //   area === {name, fixtures}
  //   fixture === {name, label, quantity, replacements, notes, elevation, animate, icon, openQty}
  //   replacement === {color, count, custom, customInstall, customProduct, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
  //   tally === {tally0, tally1, tally2, tally3}
  // ]
 	var survey = data.survey;
  // client === {clientName, phone, email, companyName, address, city, state, zip, 
  //             projectName, projectAddress, projectContact, projectDescription}
 	var client = data.client;



  // TODO: 
  //      handle signature capture
  // 	    var capture = data.capture;



  var userName = data.user.get('first') + ' ' + data.user.get('last');
  var orderString = 'Project# ' + data.orderNum;
  
  // client info header that only displays non-required lines that have text
  var clientInfo = client.companyName + '\n' +
                   (client.address ? client.address + '\n' : '') +
                   ((client.city && client.state && client.zip) ? client.city + ', ' + client.state.toUpperCase() + ' ' + client.zip + '\n' : '') +
                   client.clientName + '\n' +
                   client.phone;
  // project info header that only displays lines that have text
  var projectInfo = (client.projectName ? client.projectName + '\n' : '') +
                    (client.projectAddress ? client.projectAddress + '\n' : '') +
                    ((client.projectCity && client.projectState && client.projectZip) ? client.projectCity + ', ' + client.projectState + ' ' + client.projectZip + '\n' : '') +
                    (client.projectContact ? client.projectContact + '\n' : '');
  // test whether to display the project info header
	var projectHasText = (client.projectName || client.projectAddress || 
	                     (client.projectCity && client.projectState && client.projectZip) || 
	                     client.projectContact || client.projectDescription);
  

  var addMainDataPointsBar = function(y) {

    function makeBarWithBoxes() {
      doc.setLineWidth(1.25);
      doc.setFillColor(121, 0, 0);
      doc.setDrawColor(121, 0, 0);
      // line takes the points at either end
      doc.line(0, y, 210, y);
      doc.setLineWidth(0.5);
      doc.rect(109, y, 32, 13, 'S');
      doc.rect(141, y, 38, 13, 'FD');
      doc.rect(177.75, y, 32, 13, 'S');
    }

    function addMainDataPoints() {
      var term = pricing.term;
      var termString = term.toString() + ' months';
      // add the term, pricing, and qty data centered in each box
      setBoldFont(16);
      doc.setTextColor(121, 0, 0);

      if (term > 0) {
        // financing terms
        doc.text(centeredNum(term, 107), y + 7, termString);
      } else {
        // cash
        doc.text(118, y + 7, 'cash');
      }

      doc.setTextColor(255, 255, 255);
      doc.text(centeredNum(pricing.grandMonthly, 152), y + 7, '$' + pricing.grandMonthly.toString());
      doc.setTextColor(121, 0, 0);
      doc.text(centeredNum(pricing.totalQuantity, 187.5), y + 7, pricing.totalQuantity.toString());
      // add labels below each data point centered horizontally in each box
      setNormalFont(9);
      doc.setTextColor(121, 0, 0);

      if (term === -1) {
        // cash no install
        doc.text(118, y + 11, 'no install');
      } else if (term === 0) {
        // cash
        doc.text(117, y + 11, 'with install');
      } else {
        // financing terms
        doc.text(121.5, y + 11, 'term');
      }
      
      doc.setTextColor(255, 255, 255);
      doc.text(152.5, y + 11, 'service fee');
      doc.setTextColor(121, 0, 0);
      doc.text(186, y + 11, 'fixture count');
    }

    makeBarWithBoxes();
    addMainDataPoints();
  };

  var preparedFor = function(x, y) {
    setBoldFont();
    doc.text(x, y, 'Prepared For:');
    setNormalFont();
    doc.text(x, y + 5, clientInfo);
  };

  var projectLocationContact = function(x, y) {
    setBoldFont();
    doc.text(x, y, 'Project Location/Contact:');
    setNormalFont();
    doc.text(x, y + 5, projectInfo);
  };


  var makeCoverLetter = function() {

    var repAndDateString = userName + '\n\n\n' + date;

    function makeBullet(x, y) {
      doc.setFillColor(33, 33, 33);
      doc.circle(x + 1, y - 1, 0.5, 'F');
    }

    function addTEUContactInfo() {
      setNormalFont();
      doc.text(3, 33, teuContactString);
    }

    function addRepAndDate() {
      setItalicFont();
      doc.text(163, 33, 'REDAAP Certified,');
      setNormalFont();
      doc.text(163, 38, repAndDateString);
    }

    function addThankYou() {
      var thankYouString = 'THANK YOU ' + makeFirstNameAllCaps(client.clientName) + '!';
      setBoldFont(20);
      doc.setTextColor(121, 0, 0);
      doc.text(10, 79, thankYouString);
    }

    function addThankYouMessage() {
      setNormalFont();
      doc.text(15, 89, coverLetterMessage);
    }

    function addThankYouSubTitles() {
      setBoldFont();
      doc.text(15, 123, 'REDAAP Basics');
      doc.text(110, 123, 'Lighting as a Service');
    }

    function addRedaapBasics() {
      setNormalFont();
      doc.text(15, 128, redaapBasics);
      // passing in x and y coordinates to makeBullet()
      makeBullet(15, 148);
      doc.text(22, 148, basicsPoint1);
      makeBullet(15, 163);
      doc.text(22, 163, basicsPoint2);
      makeBullet(15, 173);
      doc.text(22, 173, basicsPoint3);
      makeBullet(15, 183);
      doc.text(22, 183, basicsPoint4);
    }

    function addLightingAsAService() {
      doc.text(110, 128, serviceBody);
    }

    function addLightingMadeSimpleImage() {
      doc.addImage(images.lightingMadeSimple, 'jpg', 108, 170, 80, 29);
    }

    function addClientAndProjectInfo() {
      preparedFor(37, 240);
      if (projectHasText) {
        projectLocationContact(114, 240);
      }
    }

    addLogos();
    addTEUContactInfo();
    addRepAndDate();
    addThankYou();
    addThankYouMessage();
    addThankYouSubTitles();
    addRedaapBasics();
    addLightingAsAService();
    addLightingMadeSimpleImage();
    // passing in y value
    addMainDataPointsBar(207);
    addClientAndProjectInfo();
    doc.addPage();
  };



  var makeProposalPage = function() {

    function addLightGrayTEUContact() {
      doc.setLineWidth(0.35);
      doc.setDrawColor(153, 153, 153);
      // line takes the points at either end
      doc.line(60, 8, 60, 19.5);
      doc.setFontSize(9);
      doc.setTextColor(153, 153, 153);
      doc.text(64, 9.5, shortTeuContactString);
    }

    function addClientAndProjectInfo() {
      preparedFor(4, 36);
      if (projectHasText) {
        projectLocationContact(64, 36);
      }
    }

    function addDate() {
      setNormalFont();
      doc.text(4, 78, date);
    }

    addLogos();
    addLightGrayTEUContact();
    addProposal(orderString);
    addClientAndProjectInfo();
    // passing in y value
    addMainDataPointsBar(73);
    addDate();
    makeTable(survey, orderString, pricing.grandMonthly, pricing.grandTax);
  };


  makeCoverLetter();
  makeProposalPage();
  var docString = doc.output('dataurlstring');
  var base64 = docString.split('base64,')[1];

	return base64;	
};
		
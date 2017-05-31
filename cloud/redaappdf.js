'use strict';

const jsPDF  = require('./jspdf.debug.js');
const images = require('./images.js');




															
const teuContactString = `TEU Services, Inc.
1454 Sidney Baker
Kerrville, TX 78028

866-512-7770
www.teuservices.com
rq@teuservices.com`;

const shortTeuContactString = `TEU Services, Inc.
866-512-7770
www.teuservices.com
rq@teuservices.com`;

const coverLetterMessage = `Thank you for your interest in REDAAP, for allowing us to conduct a lighting Survey and provide you
with a Proposal, for free. Services like, "Lighting as a Service", don't always seem to make sense at
first. Remember when we all used to purchase cassette tapes and movies on DVD? Now we listen to
music as a service and watch movies covered by a monthly service fee. CD sales and DVD sales are
going away, mobile phones are offered on monthly service plans now. Lighting as a Service means no
more trips to the hardware store to buy light bulbs.`;


const redaapBasics = `REDAAP is a service that comes with no upfront
cost, no need to buy and test products and
best of all, no hassles. Our low cost Service Fee
includes`;

const basicsPoint1 = `Removing and disposing of the old lamps
and fixtures that have mercury and other
toxic chemicals`;

const basicsPoint2 = `Installing new LED lighting that will actually
enhance your business, and best of all`;

const basicsPoint3 = `LED lighting that uses 50% to 92% less
electricity than your existing lights`;

const basicsPoint4 = `That means REDAAP actually pays for
itself by reducing electric and 
maintenance expenses`;
 
const serviceBody = `You already know about LED lighting and how
energy smart it is. REDAAP allows you to
enjoy LED lights as a Service without any of
the risk.

Please take a few minutes to review our
Proposal and don't hesitate to call us with
your questions. We are looking forward to
serving you.`;

const fine = `This Proposal includes converting existing lighting listed above to LED lighting
and providing lighting maintenance services at the Client's property (“Project”).
Client acknowledges this Proposal is subject to the Terms of Service and further
acknowledges they have received a copy of the Terms of Service and have 
reviewed and have approved and will abide by the Terms of Service. REDAAP 
Services will commence within 21 days from approval and acceptance. The first 
month's bill will become due 45 days from signing this Proposal.`;

const requirements = `Approval Requirements: Credit App Signed & Entity Organizational Documents`;
	

const firstNameAllCaps = name => name.split(' ')[0].toUpperCase();

// add spaces before numbers in order to fake right justifying
const rightJustifyNumber = (num, prefix = '') => {
  const numString = prefix + num.toString();
  let string      = '';
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
const centeredNum = (num, startX) => {
  if (num < 10) {
    return startX + 6;
  } else if (num < 100) {
    return startX + 4;
  } else if (num < 1000) {
    return startX + 2;
  } else if (num < 10000) {
    return startX;
  } else if (num < 100000) {
    return startX - 2;
  } else if (num < 1000000) {
    return startX - 4;
  } else if (num < 10000000) {
    return startX - 6;
  }
  return startX;
};


const sumTallies = tallies => tallies.reduce((prev, curr) => prev + (curr ? Number(curr) : 0), 0);

// const sumTallies = tallies => {
//   const sum = tallies.reduce((prev, curr) => {
//     const currToNumber = curr ? Number(curr) : 0;
//     return prev + currToNumber;
//   }, 0);
//   return sum;
// };

const truncate = (str, maxLength = 20) => str.length > maxLength ? `${str.slice(0, maxLength - 3)}...` : str;






module.exports.makePDF = data => {


  const doc = new jsPDF();
  // todays date with the day of the week cut out of the date object
  const date = new Date().toLocaleDateString().split(',').slice(1).join().trim();



  const setFontTypeAndSize = (type, size = 11) => {
    doc.addFont('Arial', 'Arial', type);
    doc.setFont('Arial', type);
    doc.setFontSize(size);
    doc.setTextColor(33, 33, 33);
  };

  const addLogos = () => {
    // params === image file, image type, x, y, width, height
    doc.addImage(images.redaapLogo,   'jpg', 2,   9,   54, 11);
    doc.addImage(images.poweredByTEU, 'jpg', 142, 285, 71, 10);
  };

  const addProposal = order => {
    setFontTypeAndSize('normal', 33);
    doc.setTextColor(102, 102, 102);
    doc.text(146, 16, 'PROPOSAL');
    doc.setFontSize(9);
    doc.text(146, 21, order);
  };

  const makeTableCols = y => {
    setFontTypeAndSize('bold');
    doc.text(7,   y, 'Room / Area');
    doc.text(65,  y, 'Existing Fixtures');
    doc.text(138, y, 'LED Upgrade');
    doc.text(183, y, 'Fixture Count');

    doc.setLineWidth(0.5);
    doc.setDrawColor(33, 33, 33);
    // line takes the points at either end
    doc.line(0,   y + 3, 210, y + 3);
    // tick marks
    doc.line(40,  y + 3, 40,  y + 6);
    doc.line(122, y + 3, 122, y + 6);
    doc.line(180, y + 3, 180, y + 6);
  };


  // function with side effects that generates the table of fixtures
  // while keeping track of the page number as well as the available
  // space on each page
  const makeTable = (survey, order, monthly, tax) => {
    setFontTypeAndSize('normal');

    const startOfTableY = 108;
    let lineCount       = 1;
    let currentY        = startOfTableY;
    // need two page height thresholds
    // the first indicates the height at which the footer will no longer fit with the table
    // on the same page 
    // the other threshold measures when the table has reached the bottom of the current page
    const footerThreshold     = 210;
    const pageIsFullThreshold = 258;
    let pushFooterToNewPage   = false;
    // keep track of how many pages are being generated
    let page = 1;
    // simulate a new line operation
    function nextLine() {
      // spacing down 10mm
      var newLineSpacing = 10;
      lineCount += 1;
      currentY  += newLineSpacing;
    }
    // handle adding a page based on the size of the table
    function nextPage() {
      doc.addPage();
      page += 1;
      lineCount = 1;
      currentY  = 45;

      addLogos();
      addProposal(order);
    }
    // add lines of text to build a table
    function addRow(row) {
      setFontTypeAndSize('normal');
      if (row.area) {
      	doc.text(5, currentY, truncate(row.area));
      }
      if (row.custom) {
        doc.text(45,  currentY, 'Custom Product $' + row.customProduct);
        doc.text(126, currentY, 'Custom Install $' + row.customInstall);
      } else {
        doc.text(45,  currentY, row.fixture);
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
      setFontTypeAndSize('italic', 9);
      doc.text(0, 265, requirements);
    }

    function addAcceptance() {
      doc.setLineWidth(0.35);
      doc.setDrawColor(153, 153, 153);
      // line takes the points at either end
      doc.line(0,   280, 90,  280);
      doc.line(100, 280, 135, 280);

      setFontTypeAndSize('normal', 9);
      doc.text(0,   284, 'Acceptance of Proposal');
      doc.text(100, 284, 'Date');
    }

    function addQuotedPricing() {
      const serviceFee    = monthly - tax;
      const serviceFeeStr = rightJustifyNumber(serviceFee, '$');
      const taxStr        = rightJustifyNumber(tax,        '$');
      const monthlyStr    = rightJustifyNumber(Number(monthly).toFixed(2), '$');

      setFontTypeAndSize('bold');
      doc.text(130, 235, 'Monthly Service Fee');
      doc.text(130, 242, 'Sales Tax');
      doc.text(130, 249, 'Monthly Total');

      setFontTypeAndSize('normal');
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

      setFontTypeAndSize('normal', 9);
      doc.text(0, 284, 'Initial');
    }

    function addContinued() {
      setFontTypeAndSize('normal');
      doc.text(94, 284, 'continued...');
    }  
    // add the page number to each page
    function addPageNumbersInitialAndContinued() {
      const totalPages = doc.internal.getNumberOfPages();
      // first page is the cover page so start on page 2
      const proposalPages = totalPages - 1;

      for (let i = 1; i < totalPages; i += 1) {
        const pageNumber = 'page ' + i + ' of ' + proposalPages;

        setFontTypeAndSize('normal', 9);
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
    const lastArea = survey.length - 1;
    // iterate over the survey data to create the table 
    survey.forEach((area, index) => {
      area.fixtures.forEach((fixture, fixtureIndex) => {
        fixture.replacements.forEach((replacement, replacementIndex) => {
          // addRow expects {areaName, fix, repl, count}
          // only add the areaName on the first row which is both indexes === 0
          const areaName = ((fixtureIndex === 0 && replacementIndex === 0) || lineCount === 1) ? area.name : '';
          const row = {
            area:          areaName,
            count:         replacement.count,
            custom:        replacement.custom,
            customInstall: replacement.customInstall,
            customProduct: replacement.customProduct,
            fixture:       fixture.name,
            replacement:   replacement.name
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



    
// module.exports.makePDF = data => {
  const {client, orderNum, pricing, survey, user} = data;
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
  // survey === [
  //   area === {name, fixtures}
  //   fixture === {name, label, quantity, replacements, notes, elevation, animate, icon, openQty}
  //   replacement === {color, count, custom, customInstall, customProduct, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
  //   tally === {tally0, tally1, tally2, tally3}
  // ]
  // client === {clientName, phone, email, companyName, address, city, state, zip, 
  //             projectName, projectAddress, projectContact, projectDescription}



  // TODO: 
  //      handle signature capture
  // 	    var capture = data.capture;



  const userName    = `${user.get('first')} ${user.get('last')}`;
  const orderString = `Project# ${orderNum}`;
  
  // client info header that only displays non-required lines that have text
  const clientInfo = client.companyName + '\n' +
                     (client.address ? client.address + '\n' : '') +
                     ((client.city && client.state && client.zip) ? client.city + ', ' + client.state.toUpperCase() + ' ' + client.zip + '\n' : '') +
                     client.clientName + '\n' +
                     client.phone;
  // project info header that only displays lines that have text
  const projectInfo = (client.projectName ? client.projectName + '\n' : '') +
                      (client.projectAddress ? client.projectAddress + '\n' : '') +
                      ((client.projectCity && client.projectState && client.projectZip) ? client.projectCity + ', ' + client.projectState + ' ' + client.projectZip + '\n' : '') +
                      (client.projectContact ? client.projectContact + '\n' : '');
  // test whether to display the project info header
	const projectHasText = (client.projectName || client.projectAddress || 
	                       (client.projectCity && client.projectState && client.projectZip) || 
	                       client.projectContact || client.projectDescription);
  

  const addMainDataPointsBar = y => {

    function makeBarWithBoxes() {
      doc.setLineWidth(1.25);
      doc.setFillColor(121, 0, 0);
      doc.setDrawColor(121, 0, 0);
      // line takes the points at either end
      doc.line(0, y, 210, y);
      doc.setLineWidth(0.5);
      doc.rect(109,    y, 32, 13, 'S');
      doc.rect(141,    y, 38, 13, 'FD');
      doc.rect(177.75, y, 32, 13, 'S');
    }

    function addMainDataPoints() {
      const term       = pricing.term;
      const termString = `${term.toString()} months`;
      // add the term, pricing, and qty data centered in each box
      setFontTypeAndSize('bold', 16);
      doc.setTextColor(121, 0, 0);

      if (term > 0) {
        // financing terms
        doc.text(centeredNum(term, 107), y + 7, termString);
      } else {
        // cash
        doc.text(118, y + 7, 'cash');
      }

      doc.setTextColor(255, 255, 255);
      doc.text(centeredNum(pricing.grandMonthly,  152),   y + 7, '$' + pricing.grandMonthly.toString());
      doc.setTextColor(121, 0, 0);
      doc.text(centeredNum(pricing.totalQuantity, 187.5), y + 7, pricing.totalQuantity.toString());
      // add labels below each data point centered horizontally in each box
      setFontTypeAndSize('normal', 9);
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
      doc.setTextColor(121, 0,   0);
      doc.text(186,   y + 11, 'fixture count');
    }

    makeBarWithBoxes();
    addMainDataPoints();
  };

  const preparedFor = (x, y) => {
    setFontTypeAndSize('bold');
    doc.text(x, y, 'Prepared For:');
    setFontTypeAndSize('normal');
    doc.text(x, y + 5, clientInfo);
  };

  const projectLocationContact = (x, y) => {
    setFontTypeAndSize('bold');
    doc.text(x, y, 'Project Location/Contact:');
    setFontTypeAndSize('normal');
    doc.text(x, y + 5, projectInfo);
  };


  const makeCoverLetter = () => {

    const repAndDateString = `${userName}


                              ${date}`; // three newlines

    function makeBullet(x, y) {
      doc.setFillColor(33, 33, 33);
      doc.circle(x + 1, y - 1, 0.5, 'F');
    }

    function addTEUContactInfo() {
      setFontTypeAndSize('normal');
      doc.text(3, 33, teuContactString);
    }

    function addRepAndDate() {
      setFontTypeAndSize('italic');
      doc.text(163, 33, 'REDAAP Certified,');
      setFontTypeAndSize('normal');
      doc.text(163, 38, repAndDateString);
    }

    function addThankYou() {
      var thankYouString = 'THANK YOU ' + firstNameAllCaps(client.clientName) + '!';
      setFontTypeAndSize('bold', 20);
      doc.setTextColor(121, 0, 0);
      doc.text(10, 79, thankYouString);
    }

    function addThankYouMessage() {
      setFontTypeAndSize('normal');
      doc.text(15, 89, coverLetterMessage);
    }

    function addThankYouSubTitles() {
      setFontTypeAndSize('bold');
      doc.text(15, 123, 'REDAAP Basics');
      doc.text(110, 123, 'Lighting as a Service');
    }

    function addRedaapBasics() {
      setFontTypeAndSize('normal');
      doc.text(15, 128, redaapBasics);
      // passing in x and y coordinates to makeBullet()
      makeBullet(15, 148);
      doc.text(  22, 148, basicsPoint1);
      makeBullet(15, 163);
      doc.text(  22, 163, basicsPoint2);
      makeBullet(15, 173);
      doc.text(  22, 173, basicsPoint3);
      makeBullet(15, 183);
      doc.text(  22, 183, basicsPoint4);
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



  const makeProposalPage = () => {

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
      setFontTypeAndSize('normal');
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
  const docString = doc.output('dataurlstring');
  const base64    = docString.split('base64,')[1];

	return base64;	
};
		
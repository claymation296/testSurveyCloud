'use strict';
// client === {clientName, phone, email, companyName, address, city, state, zip, 
 //             projectName, projectAddress, projectContact, projectDescription}
 // options === {brochure: bool, credit: bool, contract: bool, capture: dataURL}
 // pricing === {grandMonthly, term, totalQuantity, 
 //   collection: [{
 //     inputFixture: dataArray[index].fixture,
 //     fixture: el.existingFixture,
 //     inputDescription: dataArray[index].description,
 //     description: el.name,
 //     count: dataArray[index].count,
 //     hardCostEach: hardCostEach,
 //     productSubEach: productSubEach,
 //     installSubEach: installSubEach,
 //     total: total,
 //     maintenance: maintenance,
 //     tax: tax,
 //     loan: loan,
 //     monthlyPayment: monthlyPayment
 //   }]}
 // survey === [
 //   area === {name, fixtures}
 //   fixture === {name, label, replacements, notes, icon, savedPhotos}
 //   replacement === {color, count, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
 //   tally === {tally0, tally1, tally2, tally3}
 // ]

module.exports = {

	capFirst(str) {
		const normal 					 = str.toLowerCase();
		const [first, ...rest] = normal.split('');
		const cap 						 = first.toUpperCase();
		const capArray 				 = [cap, ...rest];
		return capArray.join('');
	},
	

	saveSurveyData(args) {
		const {
      className,
      client,
      orderNum,
      pdfFile,
      pricing,
      repData,
      survey,
      user
    } = args;

    const DbClass = Parse.Object.extend(className);
    const dbClass = new DbClass();


		// TODO: 
    //      make proper acl's so any rep who belongs to a particular company may edit
    //      any survey from other reps in that company for validation or follow-up purposes

    // // lock SentQuotes down so only the rep who created it may read from it in the future
    // var surveyACL = new Parse.ACL();
    // surveyACL.setReadAccess(user, true);
    // surveyACL.setWriteAccess(user, false);
    // dbClass.setACL(surveyACL);

    const clientKeys = Object.keys(client);
    clientKeys.forEach(key => {
      const value = (client[key] && typeof client[key] === 'string') ?
                     client[key].toLowerCase() : 
                     client[key];
      dbClass.set(key, value);
    });

    if (orderNum) {
    	dbClass.set('orderNum', orderNum);  
    }
    if (pdfFile) {
    	dbClass.set('pdf', pdfFile);
    }

    dbClass.set('client',         client);
    dbClass.set('pricing',        pricing);
    dbClass.set('monthly',        Number(pricing.grandMonthly));
    dbClass.set('quantity',       pricing.totalQuantity);
    dbClass.set('term',           Number(pricing.term));
    dbClass.set('repCompanyName', repData.get('repCompanyName'));
    dbClass.set('rep',            user);
    dbClass.set('repFirstName',   user.get('first').toLowerCase());
    dbClass.set('repLastName',    user.get('last').toLowerCase());
    dbClass.set('survey',         survey);
     
    return dbClass.save();
	}
};
'use strict';

// keep cents accurate by avoiding decimal math
const roundNum = num => Math.round(num * 100) / 100;

const sub = (price, margin, commission) =>
              roundNum((((price * 100) / (100 - margin)) * 100) / (100 - commission));

const payment = (rate, numOfPayments, tot) => {
  const monthly = (rate / 100) / 12;
  const pvif    = Math.pow(1 + monthly, numOfPayments);
  return monthly * tot * (pvif / (pvif - 1));
};

module.exports = {

	contained(collection) {
		const areasToMatch = [];
	  // create an array of fixtures to used in the 'containedIn' query constraint
	  const fixtureNames = [];
	  // return an array of replacements to used in the 'containedIn' query constraint
	  const replacementNames = collection.reduce((prev, curr) => {
	    const replacements = curr.fixtures.reduce((previous, current) => {
	      // split and trim are used to isolate the first option in the fixutre string
	      // because the first and third fixture list strings contain multiple choices 
	      // that all have the same solution ie. '2x4 Troffer / 4ft Strip Fixture / 4ft F Bay'
	      const fixtureName = current.name.split(' /')[0].trim();
	      // get just the replacement names
	      const names = current.replacements.map(replacement => {
	        // create an array of fixture names with their corresponding replacement
	        // names so the Parse.query results can be matched exactly with the inputs
	        const areaObj = {
	          area:          curr.name,
	          fixture:       fixtureName,
	          replacement:   replacement.name,
	          count:         Number(replacement.count),
	          custom:        replacement.custom,
	          customProduct: Number(replacement.customProduct),
	          customInstall: Number(replacement.customInstall)
	        };
	        areasToMatch.push(areaObj);

	        return replacement.name;
	      });

	      fixtureNames.push(fixtureName);
	      previous = previous.concat(names);
	      return previous;
	    }, []);

	    prev = prev.concat(replacements);
	    return prev;
	  }, []);

		return {areasToMatch, fixtureNames, replacementNames};
	},


	matches(results, areasToMatch) {
		// results may contain more than one match for each query so find the 
    // first matching result based on the extisting
    // fixture string found in both ie. '2x4 troffer' and '4ft strip kit'
    // and the replacement name string ie. 'LED Par20 7w Lamp'
		// pull out the attributes object from each result 
    // which contains the neccessary data from the 'Solution' table
    const collection = results.map(element => element.attributes);

    const areaMatches = areasToMatch.map(areaObj => {

      const match = collection.find(obj => 
      								obj.name === areaObj.replacement && obj.existingFixture === areaObj.fixture);

      if (!match) { return; }

      const matchObj = {
      	area:             areaObj.area,
        count:            areaObj.count,
        custom:           areaObj.custom,
        customProduct:    areaObj.customProduct,
        customInstall:    areaObj.customInstall,
        inputFixture:     areaObj.fixture,
        inputReplacement: areaObj.replacement,
        result: 					match
      };

      return matchObj;
    });

    return areaMatches
	},


	round: num => roundNum(num),

	// this equation comes from Kenneth's xcel formulas
	subtotal: (price, margin, commission) => sub(price, margin, commission),


  cost: (tot, percent) => roundNum(((tot * 100) / (100 - percent)) - tot),
  // the pmt method contains the same mathmatical formula as the native 
  // xcel PMT function
  pmt: (rate, numOfPayments, tot) => payment(rate, numOfPayments, tot),


  getCostAndInstall(fin, match) {
  	// user defined custom cost and install
    if (match.custom) {
      const customProduct = match.customProduct || 0;
      const customInstall = match.customInstall || 0;
      return {
      	hardCostEach: customProduct,
	      installSub: 	sub(customInstall, fin.installMargin, fin.installCommission)
	    };
    } else {
    	const result = match.result;
    	return {
      	hardCostEach: result.unitCost + result.partsCost + result.shipping,
      	installSub: 	sub(result.install, fin.installMargin, fin.installCommission)
    	};
    }
  },


  loanForTerm(args) {
  	const {
      fin,
      installSub,
      maintenance,
      productOnlyTax,
      productOnlyTotal,
      tax,
      term,
      tot
    } = args;

    // term === 0 for cash price and -1 for cash w/o install
    if (term > 0) {
      const loan = roundNum(payment(fin.rate, term, tot) * term);
      return {
      	installSubEach: installSub,
      	loan,
      	monthlyPayment: roundNum((loan + maintenance + tax) / term),
      	total: tot
      };
    } else if (term === 0) {
      // cash price does not include term or loan calcs
      return {
      	installSubEach: installSub,
      	loan: 0,
      	monthlyPayment: roundNum(tot + maintenance + tax), 
      	total: tot
      };
    } else if (term === -1) {
      return {
      	installSubEach: 0, 
      	loan: 0,
      	monthlyPayment: roundNum(productOnlyTotal + productOnlyTax),
      	total: 0
      };
    }
  }



};
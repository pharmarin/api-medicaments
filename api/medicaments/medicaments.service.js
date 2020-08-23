const StandardError = require("standard-error");
const TextIndex = require("../search/index/Text");
const {
  clone,
  filter,
  flattenDeep,
  includes,
  map,
  isArray,
  castArray,
  intersection,
} = require("lodash");
const normalizeString = require("../search/normalizeString");

class MedicamentsService {
  constructor(options) {
    this.medicaments = options.medicaments;
    const medicamentsAsArray = Object.keys(this.medicaments).map(
      (key) => this.medicaments[key]
    );

    this.makeNameIndex(medicamentsAsArray);
    this.makeCIPIndex(medicamentsAsArray);
    this.makeCompositionIndex(medicamentsAsArray);
  }

  makeNameIndex(medicamentsAsArray) {
    this.nameIndex = new TextIndex("denomination", { ref: "cis" });
    this.nameIndex.load(medicamentsAsArray);
  }

  makeCIPIndex(medicamentsAsArray) {
    var cipIndex = {};
    medicamentsAsArray.forEach(function (med) {
      const cis = med["cis"];
      if ("presentation" in med) {
        med["presentation"].forEach(function (pres) {
          if (pres["CIP13"]) cipIndex[pres["CIP13"]] = cis;
        });
      }
    });
    this.cipIndex = cipIndex;
  }

  makeCompositionIndex(medicamentsAsArray) {
    let compositionIndex = {};
    medicamentsAsArray.forEach(function (med) {
      const cis = med["cis"];
      if ("composition" in med) {
        med.composition.forEach(function (compo) {
          if (compo.denominationSubstance)
            compositionIndex[normalizeString(compo.denominationSubstance)] = [
              ...(compositionIndex[
                normalizeString(compo.denominationSubstance)
              ] || []),
              cis,
            ];
        });
      }
    });
    this.compositionIndex = compositionIndex;
  }

  getByCis(cis) {
    const med = this.medicaments[cis];
    if (med) return Promise.resolve(med);
    else
      return Promise.reject(
        new StandardError("Le medicament n'a pas été trouvé", { code: 404 })
      );
  }

  getByName(name) {
    const results = this.nameIndex.find(name).map((item) => {
      const result = clone(this.medicaments[item.ref]);
      result._score = item.score;
      return result;
    });

    return Promise.resolve(results);
  }

  getByCIP13(cip) {
    return this.getByCis(this.cipIndex[cip]);
  }

  getByCompo(composition) {
    let compositionArray = castArray(composition);

    compositionArray = compositionArray.map((compoQuery) =>
      flattenDeep(
        filter(this.compositionIndex, (cis, compo) =>
          includes(compo, normalizeString(compoQuery))
        )
      )
    );

    const results = map(
      intersection(...compositionArray),
      (cis) => this.medicaments[cis]
    );

    return Promise.resolve(results);
  }
}

module.exports = MedicamentsService;

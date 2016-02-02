import qs from "qs";

var QS_STRINGIFY_OPTS = {
  allowDots: true,
  encode: false,
  delimiter: '&'
};

var QS_PARSE_OPTS = {
  allowDots: true,
  delimiter: /[;,&]/
};

var query = {
    stringify(str){ return qs.stringify(str, QS_STRINGIFY_OPTS); },
    parse(obj){ return qs.parse(obj, QS_PARSE_OPTS); }
  };

export { query as query };

const PREC = {
  PAREN: -1,
  ASSIGN: 0,
  UNION: 1,
  PROMISE: 2,
  NULLABLE: 3,
  SEQUENCE: 4,
  FROZEN_ARRAY: 5,
  OBSERVABLE_ARRAY: 6,
  RECORD: 7,
  ANNOTATED: 8,
  NAMED_ARG_LIST: 9,
  ARG_LIST: 10,
  TYPE: 11,
};

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
module.exports = grammar({
  name: "webidl",

  extras: ($) => [$.comment, /[\s\uFEFF\u2060\u200B]/],

  word: ($) => $.identifier,

  supertypes: ($) => [$.primitive_type, $.float_literal],

  rules: {
    source: ($) => repeat($._definition),

    identifier: ($) => /[_-]?[A-Za-z][0-9A-Za-z_-]*/,

    _definition: ($) =>
      seq(
        choice(
          $.callback_interface,
          $.interface,
          $.mixin,
          $.namespace,
          $._partial,
          $.dictionary,
          $.enum,
          $.typedef,
          $.includes_statement
        )
      ),

    callback_interface: ($) =>
      seq(
        attribute_list($),
        "callback",
        "interface",
        field("name", $.identifier),
        field("body", $.callback_interface_members)
      ),

    interface: ($) =>
      seq(
        attribute_list($),
        "interface",
        field("name", $.identifier),
        optional($._inheritance),
        field("body", $.interface_members)
      ),

    mixin: ($) =>
      seq(
        attribute_list($),
        "interface",
        "mixin",
        field("name", $.identifier),
        field("body", $.mixin_members)
      ),

    _inheritance: ($) => seq(":", field("super", $.identifier)),

    interface_members: ($) =>
      seq("{", field("members", repeat($.interface_member)), "}", ";"),

    callback_interface_members: ($) =>
      seq("{", field("members", repeat($.interface_member)), "}", ";"),

    mixin_members: ($) =>
      seq("{", field("members", repeat($.mixin_member)), "}", ";"),

    interface_member: ($) =>
      seq(
        field("member_attributes", optional($.extended_attribute_list)),
        field(
          "member",
          choice(
            $.const,
            $._operation,
            $.stringifier,
            $.static_member,
            $.iterable,
            $.async_iterable,
            $.readonly_member,
            $.readwrite_attribute,
            $._readwrite_maplike,
            $._readwrite_setlike,
            $.inherit_attribute,
            $.constructor
          )
        )
      ),

    mixin_member: ($) =>
      seq(
        field("member_attributes", optional($.extended_attribute_list)),
        field(
          "member",
          choice(
            $.const,
            $._operation,
            $.stringifier,
            $.static_member,
            $.iterable,
            $.async_iterable,
            $.readonly_member,
            $.readwrite_attribute,
            $._readwrite_maplike,
            $._readwrite_setlike,
            $.inherit_attribute,
            $.constructor
          )
        )
      ),

    namespace: ($) =>
      seq(
        attribute_list($),
        "namespace",
        field("name", $.identifier),
        "{",
        field("members", repeat($._namespace_member)),
        "}",
        ";"
      ),

    _namespace_member: ($) =>
      choice($.regular_operation, $.readonly_member, $.const),

    _partial: ($) =>
      choice($.partial_interface, $.partial_dictionary, $.partial_namespace),

    partial_namespace: ($) =>
      seq(
        attribute_list($),
        "partial",
        "namespace",
        field("name", $.identifier),
        "{",
        field("members", repeat($._namespace_member)),
        "}",
        ";"
      ),

    partial_interface: ($) =>
      seq(
        attribute_list($),
        "partial",
        "interface",
        field("name", $.identifier),
        "{",
        field("members", repeat($._partial_interface_member)),
        "}",
        ";"
      ),

    _partial_interface_member: ($) =>
      choice(
        $.const,
        $._operation,
        $.stringifier,
        $.static_member,
        $.iterable,
        $.async_iterable,
        $.readonly_member,
        $.readwrite_attribute,
        $._readwrite_maplike,
        $._readwrite_setlike,
        $.inherit_attribute
      ),

    dictionary: ($) =>
      seq(
        attribute_list($),
        "dictionary",
        field("name", $.identifier),
        optional($._inheritance),
        field("body", $.dictionary_members)
      ),

    dictionary_members: ($) =>
      seq("{", field("members", repeat($.dictionary_member)), "}", ";"),

    dictionary_member: ($) =>
      seq(
        field("extended_attributes", optional($.extended_attribute_list)),
        seq(
          optional("required"),
          field("type", $._type),
          field("name", $.identifier),
          optional(seq("=", field("default", $._default_value))),
          ";"
        )
      ),

    partial_dictionary: ($) =>
      seq(
        attribute_list($),
        "partial",
        "dictionary",
        field("name", $.identifier),
        field("body", $.dictionary_members)
      ),

    enum: ($) =>
      seq(
        attribute_list($),
        "enum",
        field("name", $.identifier),
        "{",
        field("values", $._enum_value_list),
        "}",
        ";"
      ),

    _enum_value_list: ($) =>
      seq(
        field("enumerators", $.string),
        repeat(seq(",", field("enumerators", $.string))),
        optional(",")
      ),

    typedef: ($) =>
      seq(
        attribute_list($),
        "typedef",
        field("type", $.type_with_extended_attributes),
        field("name", $.identifier),
        ";"
      ),

    type_with_extended_attributes: ($) =>
      seq(attribute_list($), field("type", $._type)),

    includes_statement: ($) =>
      seq(
        field("target", $.identifier),
        "includes",
        field("includes", $.identifier),
        ";"
      ),

    const: ($) =>
      seq(
        "const",
        field("type", $._const_type),
        field("name", $.identifier),
        "=",
        field("value", $._const_value),
        ";"
      ),

    _const_type: ($) => choice($.primitive_type, $.identifier),

    _const_value: ($) => choice($.boolean_literal, $.float_literal, $.integer),

    boolean_literal: ($) => choice("true", "false"),

    float_literal: ($) => choice($.decimal, "-Infinity", "Infinity", "NaN"),

    readonly_member: ($) =>
      seq("readonly", field("member", $._readonly_member_rest)),

    _readonly_member_rest: ($) =>
      choice($._attribute_rest, $.maplike_rest, $.setlike_rest),

    readwrite_attribute: ($) => $._attribute_rest,

    inherit_attribute: ($) => seq("inherit", $._attribute_rest),

    _attribute_rest: ($) =>
      seq(
        "attribute",
        field("type", $.type_with_extended_attributes),
        field("name", $.identifier),
        ";"
      ),

    regular_operation: ($) =>
      seq(
        field("return_type", $._type),
        field("name", optional($.identifier)),
        field("arguments", $.argument_list),
        ";"
      ),

    _operation: ($) => choice($.regular_operation, $.special_operation),

    special_operation: ($) =>
      seq(field("special", $.special), field("operation", $.regular_operation)),

    special: ($) => choice("getter", "setter", "deleter"),

    constructor: ($) =>
      seq("constructor", field("arguments", $.argument_list), ";"),

    argument_list: ($) =>
      seq("(", commaList(field("arguments", optional($.argument))), ")"),
    argument: ($) =>
      seq(
        field("optional", optional("optional")),
        field("type", $._type),
        field("name", $.identifier),
        optional(seq("=", field("default", $._default_value)))
      ),

    _default_value: ($) =>
      choice(
        $._const_value,
        $.string,
        $.empty_sequence,
        $.default_dictionary,
        "null",
        "undefined"
      ),

    empty_sequence: ($) => "[]",
    default_dictionary: ($) => "{}",

    stringifier: ($) =>
      seq(
        "stringifier",
        choice(
          $._attribute_rest,
          seq(optional("readonly"), $._attribute_rest),
          ";"
        ),
        optional(";")
      ),

    static_member: ($) => seq("static", field("body", $._static_member_rest)),

    _static_member_rest: ($) =>
      choice(seq(optional("readonly"), $._attribute_rest), $.regular_operation),

    iterable: ($) =>
      seq(
        "iterable",
        "<",
        field("iterable_type", $._type),
        optional(seq(",", field("iterable_value_type", $._type))),
        ">",
        ";"
      ),

    async_iterable: ($) =>
      seq(
        "async",
        "iterable",
        "<",
        field("async_iterable_type", $._type),
        optional(seq(",", field("async_iterable_value_type", $._type))),
        ">",
        optional(field("arguments", $.argument_list)),
        ";"
      ),

    _readwrite_maplike: ($) => $.maplike_rest,

    maplike_rest: ($) =>
      seq(
        "maplike",
        "<",
        field("key", $._type),
        ",",
        field("value", $._type),
        ">",
        ";"
      ),

    _readwrite_setlike: ($) => $.setlike_rest,

    setlike_rest: ($) => seq("setlike", "<", field("value", $._type), ">", ";"),

    _type: ($) =>
      prec(PREC.TYPE, choice($._single_type, $.union_type, $.promise_type)),

    _single_type: ($) =>
      choice(
        $.primitive_type,
        $.string_type,
        $.buffer_related_type,
        $.identifier,
        $.sequence_type,
        $.frozen_array_type,
        $.observable_array_type,
        $.record_type,
        "object",
        "symbol",
        "any",
        "undefined",
        $.nullable_type
      ),

    union_type: ($) =>
      prec.right(
        PREC.UNION,
        seq(
          "(",
          field(
            "options",
            seq($._single_type, repeat1(seq("or", $._single_type)))
          ),
          ")",
          optional("?")
        )
      ),

    primitive_type: ($) =>
      choice(
        $.unsigned_integer_type,
        $.unrestricted_float_type,
        "boolean",
        "byte",
        "octet",
        "bigint"
      ),

    unsigned_integer_type: ($) =>
      seq("unsigned", field("type", $.integer_type)),

    integer_type: ($) => choice("short", seq("long", optional("long"))),

    unrestricted_float_type: ($) =>
      seq("unrestricted", field("type", $.float_type)),

    float_type: ($) => choice("float", "double"),

    string_type: ($) => choice("ByteString", "DOMString", "USVString"),

    promise_type: ($) =>
      prec.right(
        PREC.PROMISE,
        seq("Promise", "<", field("promise_type", $._type), ">")
      ),

    record_type: ($) =>
      prec.right(
        PREC.RECORD,
        seq(
          "record",
          "<",
          field("key", $.string_type),
          ",",
          field("value", $._type),
          ">"
        )
      ),

    sequence_type: ($) =>
      prec.right(
        PREC.SEQUENCE,
        seq("sequence", "<", field("sequence_type", $._type), ">")
      ),

    frozen_array_type: ($) =>
      prec.right(
        PREC.FROZEN_ARRAY,
        seq("FrozenArray", "<", field("frozen_type", $._type), ">")
      ),

    observable_array_type: ($) =>
      prec.right(
        PREC.OBSERVABLE_ARRAY,
        seq("ObservableArray", "<", field("observable_type", $._type), ">")
      ),

    nullable_type: ($) =>
      prec(PREC.NULLABLE, seq(field("type", $._single_type), "?")),

    buffer_related_type: ($) =>
      choice(
        "ArrayBuffer",
        "SharedArrayBuffer",
        "DataView",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Uint8Array",
        "Uint16Array",
        "Uint32Array",
        "Uint8ClampedArray",
        "BigInt64Array",
        "BigUint64Array",
        "Float16Array",
        "Float32Array",
        "Float64Array"
      ),

    extended_attribute_list: ($) =>
      seq(
        "[",
        field("attributes", $._extended_attribute),
        repeat(seq(",", field("attributes", $._extended_attribute))),
        "]"
      ),

    _extended_attribute: ($) =>
      choice(
        $.extended_attribute_no_args,
        $.extended_attribute_arg_list,
        $.extended_attribute_ident,
        $.extended_attribute_ident_list,
        $.extended_attribute_named_arg_list
      ),

    extended_attribute_no_args: ($) => field("name", $.identifier),

    extended_attribute_arg_list: ($) =>
      seq(field("name", $.identifier), field("arguments", $.argument_list)),

    extended_attribute_ident: ($) =>
      seq(field("name", $.identifier), "=", field("value", $.identifier)),

    extended_attribute_ident_list: ($) =>
      seq(
        field("name", $.identifier),
        "=",
        "(",
        field("values", $.identifier),
        repeat(seq(",", field("values", $.identifier))),
        ")"
      ),

    extended_attribute_named_arg_list: ($) =>
      prec.right(
        PREC.NAMED_ARG_LIST,
        seq(
          field("name", $.identifier),
          "=",
          field("value", $.identifier),
          field("arguments", $.argument_list)
        )
      ),

    integer: ($) => /-?([1-9][0-9]*|0[Xx][0-9A-Fa-f]+|0[0-7]*)/,

    decimal: ($) =>
      /-?(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][+-]?[0-9]+)?|[0-9]+[Ee][+-]?[0-9]+)/,

    string: ($) => /"[^"]*"/,

    comment: ($) => /\/\/.*|\/\*[^*]*(\*+[^/*][^*]*)*\*+\//,
  },
});

function commaList(g) {
  return seq(g, repeat(seq(",", g)));
}

function attribute_list($) {
  return field("attribute_list", optional($.extended_attribute_list));
}

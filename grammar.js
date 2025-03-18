/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

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
  OPERATION: 12,
};

module.exports = grammar({
  name: "webidl",

  extras: ($) => [$.comment, /[\s\uFEFF\u2060\u200B]/],

  word: ($) => $.identifier,

  supertypes: ($) => [
    $._definition,
    $._interface_member_body,
    $._mixin_member_body,
    $._namespace_member,
    $._partial_interface_member_body,
    $._type,
    $._single_type,
    $.primitive_type,
    $.float_literal,
    $._const_type,
    $._const_value,
    $._default_value,
    $._attribute,
    $._operation,
    $._extended_attribute,
    $._static_member_body,
  ],

  rules: {
    source: ($) => repeat($._definition),

    identifier: ($) => /[_-]?[A-Za-z][0-9A-Za-z_-]*/,

    // Definitions
    _definition: ($) =>
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
        field("attributes", optional($.extended_attribute_list)),
        field("member", $._interface_member_body)
      ),

    // Supertype for interface member bodies
    _interface_member_body: ($) =>
      choice(
        $.const,
        $._operation,
        $.stringifier,
        $.static_member,
        $.iterable,
        $.async_iterable,
        $._attribute,
        $._maplike,
        $._setlike,
        $.constructor
      ),

    mixin_member: ($) =>
      seq(
        field("attributes", optional($.extended_attribute_list)),
        field("member", $._mixin_member_body)
      ),

    // Supertype for mixin member bodies
    _mixin_member_body: ($) =>
      choice(
        $.const,
        $._operation,
        $.stringifier,
        $.static_member,
        $._attribute,
        $._maplike,
        $._setlike
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

    _namespace_member: ($) => choice($.regular_operation, $.attribute, $.const), // Use the unified attribute rule

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
        field("members", repeat($.partial_interface_member)),
        "}",
        ";"
      ),

    partial_interface_member: ($) =>
      seq(
        field("attributes", optional($.extended_attribute_list)),
        field("member", $._partial_interface_member_body)
      ),

    _partial_interface_member_body: ($) =>
      choice(
        $.const,
        $._operation,
        $.stringifier,
        $.static_member,
        $.iterable,
        $.async_iterable,
        $._attribute,
        $._maplike,
        $._setlike
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
        field("attributes", optional($.extended_attribute_list)),
        optional("required"),
        field("type", $._type),
        field("name", $.identifier),
        optional(seq("=", field("default", $._default_value))),
        ";"
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
        field("value", $.string),
        repeat(seq(",", field("value", $.string))),
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
        field("mixin", $.identifier), // Renamed for clarity
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

    // Attributes
    _attribute: ($) => $.attribute, // Simplified attribute

    attribute: ($) =>
      seq(
        optional(field("inherit", "inherit")), // "inherit" is just another modifier
        optional(field("readonly", "readonly")),
        "attribute",
        field("type", $.type_with_extended_attributes),
        field("name", $.identifier),
        ";"
      ),

    // Operations
    regular_operation: ($) =>
      prec(
        PREC.OPERATION,
        seq(
          field("return_type", $._type),
          field("name", optional($.identifier)),
          field("arguments", $.argument_list),
          ";"
        )
      ),

    _operation: ($) => choice($.regular_operation, $.special_operation),

    special_operation: ($) =>
      prec(
        PREC.OPERATION,
        seq(
          field("special", $.special),
          field("operation", $.regular_operation)
        )
      ),

    special: ($) => choice("getter", "setter", "deleter"),

    constructor: ($) =>
      seq("constructor", field("arguments", $.argument_list), ";"),

    argument_list: ($) =>
      seq("(", commaList(field("argument", optional($.argument))), ")"),

    argument: ($) =>
      seq(
        optional("optional"),
        field("type", $._type),
        field("name", $.identifier),
        optional(seq("=", field("default", $._default_value)))
      ),

    // Default values
    _default_value: ($) =>
      choice(
        $._const_value,
        $.string,
        $.empty_sequence,
        $.default_dictionary,
        "null",
        "undefined" //
      ),

    empty_sequence: ($) => "[]",
    default_dictionary: ($) => "{}",

    stringifier: ($) =>
      seq(
        "stringifier",
        choice($.attribute, ";"), // Use the unified attribute
        optional(";")
      ),

    // Static Members
    static_member: ($) => seq("static", field("member", $._static_member_body)),

    _static_member_body: ($) => choice($.attribute, $.regular_operation), // Use the unified attribute

    // Iterables
    iterable: ($) =>
      seq(
        "iterable",
        "<",
        field("type", $._type),
        optional(seq(",", field("value_type", $._type))),
        ">",
        ";"
      ),

    async_iterable: ($) =>
      seq(
        "async",
        "iterable",
        "<",
        field("type", $._type),
        optional(seq(",", field("value_type", $._type))),
        ">",
        optional(field("arguments", $.argument_list)),
        ";"
      ),

    // Maplike and Setlike
    _maplike: ($) => $.maplike, // Simplified maplike
    _setlike: ($) => $.setlike, // Simplified setlike

    maplike: ($) =>
      seq(
        optional(field("readonly", "readonly")),
        "maplike",
        "<",
        field("key_type", $._type),
        ",",
        field("value_type", $._type),
        ">",
        ";"
      ),

    setlike: ($) =>
      seq(
        optional(field("readonly", "readonly")),
        "setlike",
        "<",
        field("value_type", $._type),
        ">",
        ";"
      ),

    // Types
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
        $.nullable_type,
        "any",
        "undefined"
      ),

    union_type: ($) =>
      prec.right(
        PREC.UNION,
        seq(
          "(",
          field("member_types", seq($._type, repeat1(seq("or", $._type)))),
          ")",
          optional("?")
        )
      ),

    primitive_type: ($) =>
      choice(
        $.integer_type,
        $.float_type,
        "boolean",
        "byte",
        "octet",
        "bigint"
      ),

    integer_type: ($) =>
      seq(
        optional(field("unsigned", "unsigned")),
        field("base", choice("short", seq("long", optional("long"))))
      ),

    float_type: ($) =>
      seq(
        optional(field("unrestricted", "unrestricted")),
        field("base", choice("float", "double"))
      ),

    string_type: ($) => choice("ByteString", "DOMString", "USVString"),

    promise_type: ($) =>
      prec.right(
        PREC.PROMISE,
        seq("Promise", "<", field("resolve_type", $._type), ">") // Consistent naming
      ),

    record_type: ($) =>
      prec.right(
        PREC.RECORD,
        seq(
          "record",
          "<",
          field("key_type", $.string_type),
          ",",
          field("value_type", $._type),
          ">"
        )
      ),

    sequence_type: ($) =>
      prec.right(
        PREC.SEQUENCE,
        seq("sequence", "<", field("element_type", $._type), ">")
      ),

    frozen_array_type: ($) =>
      prec.right(
        PREC.FROZEN_ARRAY,
        seq("FrozenArray", "<", field("element_type", $._type), ">")
      ),

    observable_array_type: ($) =>
      prec.right(
        PREC.OBSERVABLE_ARRAY,
        seq("ObservableArray", "<", field("element_type", $._type), ">")
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

    // Extended Attributes
    extended_attribute_list: ($) =>
      seq("[", commaList(field("attribute", $._extended_attribute)), "]"),

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
        commaList(field("value", $.identifier)),
        ")"
      ),

    extended_attribute_named_arg_list: ($) =>
      prec.right(
        PREC.NAMED_ARG_LIST,
        seq(
          field("name", $.identifier),
          "=",
          field("identifier", $.identifier),
          field("arguments", $.argument_list)
        )
      ),

    // Literals
    integer: ($) => /-?([1-9][0-9]*|0[Xx][0-9A-Fa-f]+|0[0-7]*)/,

    decimal: ($) =>
      /-?(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][+-]?[0-9]+)?|[0-9]+[Ee][+-]?[0-9]+)/,

    string: ($) => /"[^"]*"/,

    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+(?:[^/*][^*]*\*+)*/, "/"))
      ),
  },
});

function commaList(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function attribute_list($) {
  return field("attributes", optional($.extended_attribute_list));
}

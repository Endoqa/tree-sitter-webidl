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
module.exports = grammar({
  name: "webidl",

  extras: ($) => [$.comment, /[\s\uFEFF\u2060\u200B]/],

  word: ($) => $.identifier,

  rules: {
    source: ($) => repeat($._definition),

    identifier: ($) => /[_-]?[A-Za-z][0-9A-Za-z_-]*/,

    _definition: ($) =>
      seq(
        optional($.extended_attribute_list),
        choice(
          $.callback_or_interface_or_mixin,
          $.namespace,
          $.partial,
          $.dictionary,
          $.enum,
          $.typedef,
          $.includes_statement
        )
      ),

    callback_or_interface_or_mixin: ($) =>
      choice($.callback_interface, $.interface, $.mixin),

    callback_interface: ($) =>
      seq(
        "callback",
        "interface",
        field("name", $.identifier),
        field("body", $.callback_interface_members)
      ),

    interface: ($) =>
      seq(
        "interface",
        field("name", $.identifier),
        optional($.inheritance),
        field("body", $.interface_members)
      ),

    mixin: ($) =>
      seq(
        "interface",
        "mixin",
        field("name", $.identifier),
        field("body", $.mixin_members)
      ),

    inheritance: ($) => seq(":", field("super", $.identifier)),

    interface_members: ($) =>
      seq("{", field("members", repeat($.interface_member)), "}", ";"),

    callback_interface_members: ($) =>
      seq("{", field("members", repeat($.interface_member)), "}", ";"),

    mixin_members: ($) =>
      seq("{", field("members", repeat($.mixin_member)), "}", ";"),

    interface_member: ($) =>
      seq(
        field("extended_attributes", optional($.extended_attribute_list)),
        choice(
          $.const,
          $.operation,
          $.stringifier,
          $.static_member,
          $.iterable,
          $.async_iterable,
          $.readonly_member,
          $.readwrite_attribute,
          $.readwrite_maplike,
          $.readwrite_setlike,
          $.inherit_attribute,
          $.constructor
        )
      ),

    mixin_member: ($) =>
      seq(
        field("extended_attributes", optional($.extended_attribute_list)),
        choice(
          $.const,
          $.regular_operation,
          $.stringifier,
          seq(optional("readonly"), $.attribute_rest)
        )
      ),

    namespace: ($) =>
      seq(
        "namespace",
        field("name", $.identifier),
        "{",
        repeat($._namespace_member),
        "}",
        ";"
      ),

    _namespace_member: ($) =>
      choice($.regular_operation, seq("readonly", $.attribute_rest), $.const),

    partial: ($) => seq("partial", $._partial_definition),

    _partial_definition: ($) =>
      choice($.partial_interface, $.partial_dictionary, $.namespace),

    partial_interface: ($) =>
      seq(
        "interface",
        field("name", $.identifier),
        field("body", $.partial_interface_members)
      ),

    partial_interface_members: ($) =>
      seq("{", field("members", repeat($._partial_interface_member)), "}", ";"),

    _partial_interface_member: ($) =>
      choice(
        $.const,
        $.operation,
        $.stringifier,
        $.static_member,
        $.iterable,
        $.async_iterable,
        $.readonly_member,
        $.readwrite_attribute,
        $.readwrite_maplike,
        $.readwrite_setlike,
        $.inherit_attribute
      ),

    dictionary: ($) =>
      seq(
        "dictionary",
        field("name", $.identifier),
        optional($.inheritance),
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
      seq("dictionary", field("name", $.identifier), field("body", $.dictionary_members)),

    enum: ($) =>
      seq(
        "enum",
        field("name", $.identifier),
        "{",
        field("values", $.enum_value_list),
        "}",
        ";"
      ),

    enum_value_list: ($) =>
      seq(
        field("value", $.string),
        repeat(seq(",", field("value", $.string))),
        optional(",")
      ),

    typedef: ($) =>
      seq(
        "typedef",
        field("type", $.type_with_extended_attributes),
        field("name", $.identifier),
        ";"
      ),

    type_with_extended_attributes: ($) =>
      seq(optional($.extended_attribute_list), field("type", $._type)),

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

    readonly_member: ($) => seq("readonly", $._readonly_member_rest),

    _readonly_member_rest: ($) =>
      choice($.attribute_rest, $.maplike_rest, $.setlike_rest),

    readwrite_attribute: ($) => $.attribute_rest,

    inherit_attribute: ($) => seq("inherit", $.attribute_rest),

    attribute_rest: ($) =>
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

    operation: ($) =>  choice($.regular_operation, $.special_operation),

    special_operation: ($) =>
      seq(
        field("special", $.special),
        field("operation", $.regular_operation)
      ),

    special: ($) => choice("getter", "setter", "deleter"),

    constructor: ($) =>
      seq("constructor", field("arguments", $.argument_list), ";"),

    argument_list: ($) =>
      prec.right(
        PREC.ARG_LIST,
        seq("(", field("arguments", optional($.argument)), ")")
      ),

    argument: ($) =>
      seq(
        field("optional", optional("optional")),
        field("type", $._type),
        field("name", $.identifier),
        optional(seq("=", field("default", $._default_value))),
        repeat(
          seq(
            ",",
            seq(
              field("optional", optional("optional")),
              field("type", $._type),
              field("name", $.identifier),
              optional(seq("=", field("default", $._default_value)))
            )
          )
        )
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
          $.attribute_rest,
          seq(optional("readonly"), $.attribute_rest),
          ";"
        ),
        optional(";")
      ),

    static_member: ($) =>
      seq("static", field("body", $._static_member_rest)),

    _static_member_rest: ($) =>
      choice(seq(optional("readonly"), $.attribute_rest), $.regular_operation),

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

    readwrite_maplike: ($) => $.maplike_rest,

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

    readwrite_setlike: ($) => $.setlike_rest,

    setlike_rest: ($) =>
      seq("setlike", "<", field("value", $._type), ">", ";"),

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
          field("options", seq($._single_type, repeat1(seq("or", $._single_type)))),
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

    unsigned_integer_type: ($) => seq(
      "unsigned",
      field("type", $.integer_type)
    ),

    integer_type: ($) =>
      choice("short", seq("long", optional("long"))),

    unrestricted_float_type: ($) => seq("unrestricted", $.float_type),

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
        field("attributes", $.extended_attribute),
        repeat(seq(",", field("attributes", $.extended_attribute))),
        "]"
      ),

    extended_attribute: ($) =>
      choice(
        $.extended_attribute_no_args,
        $.extended_attribute_arg_list,
        $.extended_attribute_ident,
        $.extended_attribute_ident_list,
        $.extended_attribute_named_arg_list
      ),

    extended_attribute_no_args: ($) => field("name", $.identifier),

    extended_attribute_arg_list: ($) =>
      seq(
        field("name", $.identifier),
        field("arguments", $.argument_list)
      ),

    extended_attribute_ident: ($) =>
      seq(
        field("name", $.identifier),
        "=",
        field("value", $.identifier)
      ),

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

    integer: ($) =>
      /-?([1-9][0-9]*|0[Xx][0-9A-Fa-f]+|0[0-7]*)/,

    decimal: ($) =>
      /-?(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][+-]?[0-9]+)?|[0-9]+[Ee][+-]?[0-9]+)/,

    string: ($) => /"[^"]*"/,

    comment: ($) =>
      /\/\/.*|\/\*[^*]*(\*+[^/*][^*]*)*\*+\//
  },
});

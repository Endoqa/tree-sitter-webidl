import XCTest
import SwiftTreeSitter
import TreeSitterWebidl

final class TreeSitterWebidlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_webidl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Webidl grammar")
    }
}

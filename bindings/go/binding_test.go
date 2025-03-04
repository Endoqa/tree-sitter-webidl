package tree_sitter_webidl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_webidl "github.com/endoqa/tree-sitter-webidl/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_webidl.Language())
	if language == nil {
		t.Errorf("Error loading Webidl grammar")
	}
}

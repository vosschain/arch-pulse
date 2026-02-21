// Test fixture: a file with lots of comments - we want low non-comment count
// This is a top-level file comment
// It explains what the module does
// and spans several lines

/**
 * Block comment here
 * Multi-line block comment
 * More text
 */

// Another single-line comment
/* Single block comment */

export const PURE_CODE_A = "hello"; // inline comment should still count
export const PURE_CODE_B = 42;
export const PURE_CODE_C = true;
// trailing comment

/*
 * Another multi-line block
 * comment here
 */
export function pureFunc() {
  return "result";
}

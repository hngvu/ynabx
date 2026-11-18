//! Popover and Modal Coordinate Positioning Engine (100% integer math)
//! Exact port of `popoverPosition.ts` (`wrapper-DkFKwf1z.js` `positionModal` & `positionArrow`).

#![deny(clippy::float_arithmetic)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DomRect {
    pub top: i32,
    pub left: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ArrowDirection {
    #[default]
    Up,
    Down,
    Left,
    Right,
    None,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum HorizontalAlign {
    #[default]
    Center,
    Start,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct PointOffset {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PositionOptions {
    pub trigger_rect: Option<DomRect>,
    pub modal_width: i32,
    pub modal_height: i32,
    pub window_width: i32,
    pub window_height: i32,
    pub arrow_direction: ArrowDirection,
    pub arrow_offset: PointOffset,
    pub horizontal_align: HorizontalAlign,
    pub offset: PointOffset,
    pub window_margin: i32,
}

impl Default for PositionOptions {
    fn default() -> Self {
        Self {
            trigger_rect: None,
            modal_width: 300,
            modal_height: 200,
            window_width: 1920,
            window_height: 1080,
            arrow_direction: ArrowDirection::Up,
            arrow_offset: PointOffset { x: 0, y: 0 },
            horizontal_align: HorizontalAlign::Center,
            offset: PointOffset { x: 0, y: 0 },
            window_margin: 10,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CalculatedPosition {
    pub top: i32,
    pub left: i32,
    pub arrow_left: String,
    pub arrow_top: String,
    pub arrow_transform: String,
}

pub fn calculate_popover_position(opts: &PositionOptions) -> CalculatedPosition {
    let margin = opts.window_margin;
    let Some(trigger) = opts.trigger_rect else {
        let default_top = margin.max((opts.window_height - opts.modal_height) / 2);
        let default_left = margin.max((opts.window_width - opts.modal_width) / 2);
        return CalculatedPosition {
            top: default_top,
            left: default_left,
            arrow_left: "50%".to_string(),
            arrow_top: String::new(),
            arrow_transform: String::new(),
        };
    };

    let arrow_size = 15;
    let l = 12;

    let trigger_center_x = trigger.left + trigger.width / 2;
    let trigger_center_y = trigger.top + trigger.height / 2;

    let get_horizontal_x = || match opts.horizontal_align {
        HorizontalAlign::Start => trigger_center_x - arrow_size - l,
        HorizontalAlign::Center => trigger_center_x - opts.modal_width / 2,
    };

    let mut modal_x = 0;
    let mut modal_y = 0;

    match opts.arrow_direction {
        ArrowDirection::Up => {
            modal_x = get_horizontal_x();
            modal_y = trigger.top + trigger.height + arrow_size;
        }
        ArrowDirection::Down => {
            modal_x = get_horizontal_x();
            modal_y = trigger.top - opts.modal_height - arrow_size;
        }
        ArrowDirection::Left => {
            modal_x = trigger.left + trigger.width + arrow_size;
            modal_y = trigger_center_y - opts.modal_height / 2;
        }
        ArrowDirection::Right => {
            modal_x = trigger.left - opts.modal_width - arrow_size;
            modal_y = trigger_center_y - opts.modal_height / 2;
        }
        ArrowDirection::None => {}
    }

    modal_x += opts.offset.x;
    modal_y += opts.offset.y;

    let mut constrained_x = modal_x;
    if matches!(
        opts.arrow_direction,
        ArrowDirection::Up | ArrowDirection::Down | ArrowDirection::None
    ) {
        if modal_x < margin {
            constrained_x = margin;
        } else if modal_x + opts.modal_width > opts.window_width - margin {
            let t = trigger.left + trigger.width / 2 - opts.modal_width;
            constrained_x = (opts.window_width - opts.modal_width - margin).max(t);
        }
    }

    let mut constrained_y = modal_y;
    if matches!(
        opts.arrow_direction,
        ArrowDirection::Left | ArrowDirection::Right | ArrowDirection::None
    ) {
        if modal_y < margin {
            constrained_y = margin.min(trigger.top + trigger.height);
        } else if modal_y + opts.modal_height > opts.window_height - margin {
            constrained_y = opts.window_height - opts.modal_height - margin;
        }
    }

    modal_x = constrained_x;
    modal_y = constrained_y;

    let mut arrow_left = "50%".to_string();
    let mut arrow_top = String::new();

    if matches!(
        opts.arrow_direction,
        ArrowDirection::Up | ArrowDirection::Down
    ) {
        let raw_arrow_left = trigger_center_x - modal_x - arrow_size + opts.arrow_offset.x;
        let bounded = raw_arrow_left.clamp(12, (opts.modal_width - 42).max(12));
        arrow_left = format!("{}px", bounded);
    }

    if matches!(
        opts.arrow_direction,
        ArrowDirection::Left | ArrowDirection::Right
    ) {
        let raw_arrow_top = trigger_center_y - modal_y - arrow_size + opts.arrow_offset.y;
        let bounded = raw_arrow_top.clamp(12, (opts.modal_height - 42).max(12));
        arrow_top = format!("{}px", bounded);
    }

    let arrow_transform = match opts.arrow_direction {
        ArrowDirection::Down => "rotate(180 50 50)".to_string(),
        ArrowDirection::Left => "rotate(-90 50 50)".to_string(),
        ArrowDirection::Right => "rotate(90 50 50)".to_string(),
        ArrowDirection::Up | ArrowDirection::None => String::new(),
    };

    CalculatedPosition {
        top: modal_y,
        left: modal_x,
        arrow_left,
        arrow_top,
        arrow_transform,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_centers_popover_when_trigger_rect_is_none() {
        let pos = calculate_popover_position(&PositionOptions {
            trigger_rect: None,
            modal_width: 300,
            modal_height: 200,
            window_width: 1920,
            window_height: 1080,
            window_margin: 10,
            ..Default::default()
        });
        assert_eq!(pos.left, (1920 - 300) / 2);
        assert_eq!(pos.top, (1080 - 200) / 2);
    }

    #[test]
    fn test_positions_below_trigger_with_arrow_up() {
        let pos = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(DomRect {
                top: 100,
                left: 500,
                width: 80,
                height: 30,
            }),
            modal_width: 200,
            modal_height: 150,
            arrow_direction: ArrowDirection::Up,
            ..Default::default()
        });
        assert_eq!(pos.top, 145);
        assert_eq!(pos.left, 440);
        assert_eq!(pos.arrow_transform, "");
    }

    #[test]
    fn test_positions_above_left_right_and_constrains_edges() {
        let trigger = DomRect {
            top: 300,
            left: 500,
            width: 80,
            height: 30,
        };
        let down = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(trigger),
            modal_width: 200,
            modal_height: 100,
            arrow_direction: ArrowDirection::Down,
            ..Default::default()
        });
        assert_eq!(down.top, 185);
        assert_eq!(down.arrow_transform, "rotate(180 50 50)");

        let left_dir = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(DomRect {
                top: 200,
                left: 300,
                width: 100,
                height: 50,
            }),
            modal_width: 250,
            modal_height: 120,
            arrow_direction: ArrowDirection::Left,
            ..Default::default()
        });
        assert_eq!(left_dir.left, 415);
        assert_eq!(left_dir.arrow_transform, "rotate(-90 50 50)");

        let right_dir = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(DomRect {
                top: 200,
                left: 600,
                width: 100,
                height: 50,
            }),
            modal_width: 200,
            modal_height: 120,
            arrow_direction: ArrowDirection::Right,
            ..Default::default()
        });
        assert_eq!(right_dir.left, 385);
        assert_eq!(right_dir.arrow_transform, "rotate(90 50 50)");

        // Near left screen edge
        let near_left = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(DomRect {
                top: 200,
                left: 5,
                width: 20,
                height: 20,
            }),
            modal_width: 300,
            modal_height: 200,
            arrow_direction: ArrowDirection::Up,
            window_margin: 15,
            ..Default::default()
        });
        assert!(near_left.left >= 15);

        // Start alignment
        let start_align = calculate_popover_position(&PositionOptions {
            trigger_rect: Some(DomRect {
                top: 200,
                left: 400,
                width: 100,
                height: 40,
            }),
            modal_width: 200,
            modal_height: 150,
            arrow_direction: ArrowDirection::Up,
            horizontal_align: HorizontalAlign::Start,
            ..Default::default()
        });
        assert_eq!(start_align.left, 423);
    }
}

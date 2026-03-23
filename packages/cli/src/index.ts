#!/usr/bin/env node
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerInfo } from "./commands/info.js";
import { registerValidate } from "./commands/validate.js";
import { registerAdd } from "./commands/add.js";
import { registerRemove } from "./commands/remove.js";
import { registerGet } from "./commands/get.js";
import { registerSlice } from "./commands/slice.js";
import { registerFill } from "./commands/fill.js";
import { registerScaffold } from "./commands/scaffold.js";
import { registerRender } from "./commands/render.js";

const program = new Command();

program
  .name("boxel")
  .description("Boxel Planner CLI — Minecraft系ボクセルゲームの建築支援ツール")
  .version("0.0.1");

registerInit(program);
registerInfo(program);
registerValidate(program);
registerAdd(program);
registerRemove(program);
registerGet(program);
registerSlice(program);
registerFill(program);
registerScaffold(program);
registerRender(program);

program.parse();

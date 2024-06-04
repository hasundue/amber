import { transform } from "@chiezo/bddoc";

Deno.chdir(new URL("../", import.meta.url));

let template = await Deno.readTextFile("./docs/readme.md");

for (const mod of ["cmd", "fs", "util"]) {
  template = template.replace(
    new RegExp(`<!-- ${mod} -->\n`, "g"),
    await transform(
      await Deno.readTextFile(`./src/${mod}_test.ts`),
      { heading: 4 },
    ),
  );
}

await Deno.writeTextFile("README.md", template);

await new Deno.Command("deno", {
  args: ["fmt", "README.md"],
}).output();

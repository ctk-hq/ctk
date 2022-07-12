import io
import re
import sys
import random
import string
import ast
import uuid
import contextlib
import docker
from better_profanity import profanity

from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import (
    SingleQuotedScalarString,
    DoubleQuotedScalarString)

from api.models import Project


try:
    import textwrap
    textwrap.indent
except AttributeError:
    def indent(text, amount, ch=' '):
        padding = amount * ch
        return ''.join(padding+line for line in text.splitlines(True))
else:
    def indent(text, amount, ch=' '):
        return textwrap.indent(text, amount * ch)


def get_project_obj_by_id(id):
    with contextlib.suppress(Project.DoesNotExist):
        return Project.objects.get(pk=id)
    return None

def get_project_obj_by_uuid(uuid):
    with contextlib.suppress(Project.DoesNotExist):
        return Project.objects.get(uuid=uuid)
    return None


def sequence_indent_four(s):
    ret_val = ''
    first_indent = True

    for line in s.splitlines(True):
        ls = line.lstrip()
        indent = len(line) - len(ls)

        if indent == 2 and first_indent == False:
            ret_val += "\n"
        
        ret_val += line

        if indent == 2 and first_indent == True:
            first_indent = False

    return ret_val


def sequence_indent_one(s):
    ret_val = ''
    first_indent = True

    for line in s.splitlines(True):
        ls = line.lstrip()
        indent = len(line) - len(ls)

        if indent == 0 and first_indent == False:
            ret_val += "\n"
        
        ret_val += line

        if indent == 0 and first_indent == True:
            first_indent = False

    return ret_val


def format_quotes(s):
    if '\'' in s:
        return SingleQuotedScalarString(s.replace("'", ''))
    if '"' in s:
        return DoubleQuotedScalarString(s.replace('"', ''))

    return SingleQuotedScalarString(s) 


def format_volumes_top_level(volumes, compose_version):
    ret = {}

    for volume in volumes:
        volume_custom_name = volume.get('volume_name', None)
        volume_driver = volume.get('driver', None)
        external = volume.get('external', False)
        external_name = volume.get('external_name', False)
        ret[volume['name']] = {}

        if external:
            ret[volume['name']]['external'] = True

            if external_name:
                ret[volume['name']]['external'] = {
                    'name': external_name
                }

        if volume_custom_name:
            ret[volume['name']]['name'] = volume_custom_name

        if volume_driver:
            ret[volume['name']]['driver'] = volume_driver

        if compose_version in [2, 3]:
            if labels := volume.get('labels', None):
                ret[volume['name']]['labels'] = {}
                for label in labels:
                    ret[volume['name']]['labels'][label['key']] = format_quotes(label['value'])

        if not ret[volume['name']]:
            ret[volume['name']] = None

    return ret


def format_networks_top_level(networks, compose_version):
    ret = {}

    for network in networks:
        network_custom_name = network.get('object_name', None)
        network_driver = network.get('driver', None)
        network_custom_driver = network.get('driver_custom', False)
        external = network.get('external', False)
        external_name = network.get('external_name', False)
        driver_opts = network.get('driver_opts', None)
        ret[network['name']] = {}

        if external:
            ret[network['name']]['external'] = True
            ret[network['name']]['name'] = external_name

        if network_custom_name:
            ret[network['name']]['name'] = network_custom_name

        if network_driver:
            ret[network['name']]['driver'] = network_driver

        if driver_opts:
            ret[network['name']]['driver_opts'] = {}
            for driver_opt in driver_opts:
                ret[network['name']]['driver_opts'][driver_opt['key']] = format_quotes(driver_opt['value'])

        if compose_version in [2, 3]:
            if labels := network.get('labels', None):
                ret[network['name']]['labels'] = {}
                for label in labels:
                    ret[network['name']]['labels'][label['key']] = format_quotes(label['value'])

        if not ret[network['name']]:
            ret[network['name']] = None

    return ret


def format_key_val_pairs(pairs):
    return {pair_part['key']: pair_part['value'] for pair_part in pairs}


def format_ports(ports):
    service_ports_formatted = []
    for port in ports:
        port_published = port['published']
        port_target = port['target']
        formatter_string = DoubleQuotedScalarString(f"{port_published}")

        if port_target:
            formatter_string = DoubleQuotedScalarString(f"{port_published}:{port_target}")

        service_ports_formatted.append(formatter_string)
    
    return service_ports_formatted


def format_volumes(service_volumes, volumes):
    ret = []
    for service_volume in service_volumes:
        for volume in volumes:
            if 'volume' in service_volume and service_volume['volume'] == volume['uuid']:
                volume_mount_str = f"{volume['name']}:{service_volume['destination']}"
                ret.append(volume_mount_str)

        if 'relativePathSource' in service_volume:
            volume_mount_str = f"{service_volume['relativePathSource']}:{service_volume['destination']}"
            ret.append(volume_mount_str)

    return ret


def format_networks(service_networks, networks):
    ret = []

    if service_networks:
        for service_network_uuid in service_networks:
            for network in networks:
                if service_network_uuid == network['uuid']:
                    network_str = f"{network['name']}"
                    ret.append(network_str)

    return ret


def clean_string(string):
    string = " ".join(re.findall(r"[a-zA-Z0-9]+", string))
    string = string.lower()
    string = string.replace(' ', '-')
    return string


def format_command_string(command):
    """
    Format command list of string for v1, v2, v3.
    param: command: string
    return: list
    """
    command_list = []
    command = str(command)
    command_list = command.replace("\n", "")

    try:
        # try to convert the string into list
        command_list = ast.literal_eval(command_list)
    except (ValueError, SyntaxError) as e:
        # special case
        if "\n" in command:
            command_list = command.split("\n")
        else:
            return command
    except Exception as e:
        return command

    if len(command_list) > 1:
        longest_str = max(command_list, key=len)

        if len(longest_str) >= 30:
            return [format_quotes(i) for i in command_list]

        return FSlist(command_list)
    
    return command_list[0]


def format_build(specified_version, build):
    if isinstance(build, str):
        return build

    build_str = build.get('build', None)
    context_str = build.get('context', None)
    ret = {}

    if specified_version < 2:
        if build_str:
            return build_str
        elif context_str:
            return context_str
        else:
            return None

    if build_str:
        return build_str

    for _key, _val in build.items():
        if _val:
            if _key in ['args', 'cache_from', 'labels']:
                ret[_key] = format_key_val_pairs(_val)
            else:
                ret[_key] = _val

    return ret


def _remove_missing_and_underscored_keys(str):
    if not str: return str
    for key in list(str.keys()):
        if isinstance(str[key], list):
            str[key] = list(filter(None, str[key]))
        if not str.get(key):
            del str[key]
        elif isinstance(str[key], dict):
            str[key] = _remove_missing_and_underscored_keys(str[key])
            if str[key] is None or str[key] == {}:
                del str[key]

    return str


def format_deploy(deploy):
    ret = deploy

    with contextlib.suppress(Exception):
        placement_preferences = deploy['placement']['preferences']
        ret['placement']['preferences'] = format_key_val_pairs(placement_preferences)
    with contextlib.suppress(Exception):
        labels = deploy['labels']
        ret['labels'] = format_key_val_pairs(labels)
    ret = _remove_missing_and_underscored_keys(ret)
    return ret


def get_version(verion):
    try:
        return int(verion)
    except ValueError:
        return float(verion)


def format_services_version_one(specified_version, services, volumes, networks):
    services_formatted = {}

    for service in services:
        service_formatted = {}

        if image := service.get('image', None):
            image_tag = "latest"

            try:
                image_tag = service['tag']
                service_formatted['image'] = f"{image}:{image_tag}"
            except KeyError:
                service_formatted['image'] = f"{image}"

        with contextlib.suppress(KeyError):
            if service['container_name']:
                service_formatted['container_name'] = service['container_name']
        with contextlib.suppress(KeyError):
            if service['restart']:
                service_formatted['restart'] = service['restart']
        with contextlib.suppress(KeyError):
            if service['command']:
                service_formatted['command'] = format_command_string(service['command'])
        with contextlib.suppress(KeyError):
            if service['entrypoint']:
                service_formatted['entrypoint'] = format_command_string(service['entrypoint'])
        with contextlib.suppress(KeyError):
            if service['working_dir']:
                service_formatted['working_dir'] = service['working_dir']
        with contextlib.suppress(KeyError):
            if service['ports']:
                service_formatted['ports'] = format_ports(service['ports'])
        with contextlib.suppress(KeyError):
            if links := service.get('links', []):
                service_formatted['links'] = []
                for link in links:
                    for service_obj in services:
                        if link == service_obj['uuid']:
                            service_formatted['links'].append(f"{service_obj['name']}")
        with contextlib.suppress(KeyError):
            if service['environment']:
                envs = service['environment']
                service_formatted['environment'] = format_key_val_pairs(envs)
        with contextlib.suppress(KeyError):
            service_volumes = service['volumes']
            if formatted_volumes := format_volumes(service_volumes, volumes):
                service_formatted['volumes'] = formatted_volumes
            else:
                del service_formatted['volumes']
        with contextlib.suppress(KeyError):
            if build := format_build(specified_version, service['build']):
                service_formatted['build'] = build
        services_formatted[service['name']] = service_formatted

    return services_formatted


def get_service_by_label_key(key, services):
  for service in services:
    with contextlib.suppress(KeyError):
      if key == service["labels"]["key"]:
        return service
  
  return None


def get_connected_services(service_key, connections, services):
    connected_services = []
    for connection in connections:
      if service_key == connection[0]:
        if connected_service := get_service_by_label_key(connection[1], services):
          connected_services.append(connected_service)
    return connected_services


def format_services_version_three(specified_version, services, connections, volumes, networks):
    services_formatted = {}

    for service in services:
        service_formatted = {}
        service_key = ""

        # add labels excluding certain keys
        if labels := service.get('labels', {}):
            clean_labels = {x: labels[x] for x in labels if x not in ["key"]}
            if "key" in labels:
              service_key = labels["key"]
            if bool(clean_labels):
                service_formatted['labels'] = clean_labels

        # image name
        if image := service.get('image', None):
            image_tag = "latest"

            try:
                image_tag = service['tag']
                service_formatted['image'] = f"{image}:{image_tag}"
            except KeyError:
                service_formatted['image'] = f"{image}"

        # dependencies
        with contextlib.suppress(KeyError):
            if connected_services := get_connected_services(service_key, connections, services):
              service_formatted['depends_on'] = []
              for connected_service in connected_services:
                service_formatted['depends_on'].append(f"{connected_service['service_name']}")
        with contextlib.suppress(KeyError):
            if service['container_name']:
                service_formatted['container_name'] = service['container_name']
        with contextlib.suppress(KeyError):
            if service['restart']:
                service_formatted['restart'] = service['restart']
        with contextlib.suppress(KeyError):
            if service['command']:
                service_formatted['command'] = format_command_string(service['command'])
        with contextlib.suppress(KeyError):
            if service['entrypoint']:
                service_formatted['entrypoint'] = format_command_string(service['entrypoint'])
        with contextlib.suppress(KeyError):
            if working_dir_str := service['working_dir']:
                service_formatted['working_dir'] = working_dir_str
        with contextlib.suppress(KeyError):
            if service['ports']:
                service_formatted['ports'] = format_ports(service['ports'])
        with contextlib.suppress(KeyError):
            if service['environment']:
                envs = service['environment']
                service_formatted['environment'] = format_key_val_pairs(envs)
        with contextlib.suppress(KeyError):
            service_volumes = service['volumes']
            if formatted_volumes := format_volumes(service_volumes, volumes):
                service_formatted['volumes'] = formatted_volumes
            else:
                del service_formatted['volumes']
        with contextlib.suppress(KeyError):
            service_networks = service.get('networks', [])
            if formatted_networks := format_networks(service_networks, networks):
                service_formatted['networks'] = formatted_networks
            else:
                del service_formatted['networks']
        with contextlib.suppress(KeyError):
            if build := format_build(specified_version, service['build']):
                service_formatted['build'] = build
        if int(float(specified_version)) >= 3:
            with contextlib.suppress(KeyError):
                if deploy := format_deploy(service['deploy']):
                    service_formatted['deploy'] = deploy
        services_formatted[service['service_name']] = service_formatted

    return services_formatted


def FSlist(l):  # concert list into flow-style (default is block style)
    from ruamel.yaml.comments import CommentedSeq

    double_quoted_list = [DoubleQuotedScalarString(x) for x in l]
    cs = CommentedSeq(double_quoted_list)
    cs.fa.set_flow_style()
    return cs


def generate_dc(services, connections, volumes, networks, secrets, configs, version="3", return_format='yaml'):
    if return_format != 'yaml':
        return

    s = io.StringIO()
    ret_yaml = YAML()
    ret_yaml.indent(mapping=2, sequence=4, offset=2)
    ret_yaml.explicit_start = True
    specified_version = get_version(version)
    base_version = int(specified_version)

    if services:
        if base_version in {2, 3}:
            ret_yaml.dump({'version': DoubleQuotedScalarString(specified_version)}, s)
            ret_yaml.explicit_start = False
            s.write('\n')
            services_formatted = format_services_version_three(specified_version, services, connections, volumes, networks)
            ret_yaml.dump({'services': services_formatted}, s, transform=sequence_indent_four)

        if base_version == 1:
            ret_yaml.dump({'version': DoubleQuotedScalarString(specified_version)}, s)
            ret_yaml.explicit_start = False
            s.write('\n')
            services_formatted = format_services_version_one(specified_version, services, volumes, networks)
            ret_yaml.dump(services_formatted, s, transform=sequence_indent_one)

        s.write('\n')

    if base_version in {3, 2} and networks:
        networks_formatted = format_networks_top_level(networks, version)
        ret_yaml.dump({'networks': networks_formatted}, s)
        s.write('\n')

    if volumes:
        volumes_formatted = format_volumes_top_level(volumes, version)
        ret_yaml.dump({'volumes': volumes_formatted}, s)
        s.write('\n')

    if secrets:
        ret_yaml.dump({'secrets': secrets}, s)
        s.write('\n')

    if configs:
        ret_yaml.dump({'configs': configs}, s)
        s.write('\n')

    s.seek(0)

    return s


def generate(cname):
    c = docker.from_env()

    try:
        cid = [x.short_id for x in c.containers.list() if cname == x.name or x.short_id in cname][0]
    except IndexError:
        sys.exit(1)

    cattrs = c.containers.get(cid).attrs
    cfile = {cattrs['Name'][1:]: {}}
    ct = cfile[cattrs['Name'][1:]]

    values = {
        'cap_add': cattrs['HostConfig']['CapAdd'],
        'cap_drop': cattrs['HostConfig']['CapDrop'],
        'cgroup_parent': cattrs['HostConfig']['CgroupParent'],
        'container_name': cattrs['Name'][1:],
        'devices': cattrs['HostConfig']['Devices'],
        'dns': cattrs['HostConfig']['Dns'],
        'dns_search': cattrs['HostConfig']['DnsSearch'],
        'environment': cattrs['Config']['Env'],
        'extra_hosts': cattrs['HostConfig']['ExtraHosts'],
        'image': cattrs['Config']['Image'],
        'labels': cattrs['Config']['Labels'],
        'links': cattrs['HostConfig']['Links'],
        #'log_driver': cattrs['HostConfig']['LogConfig']['Type'],
        #'log_opt': cattrs['HostConfig']['LogConfig']['Config'],
        'logging': {'driver': cattrs['HostConfig']['LogConfig']['Type'], 'options': cattrs['HostConfig']['LogConfig']['Config']},
        'networks': {x: {'aliases': cattrs['NetworkSettings']['Networks'][x]['Aliases']} for x in cattrs['NetworkSettings']['Networks'].keys()},
        'security_opt': cattrs['HostConfig']['SecurityOpt'],
        'ulimits': cattrs['HostConfig']['Ulimits'],
        'volumes': cattrs['HostConfig']['Binds'],
        'volume_driver': cattrs['HostConfig']['VolumeDriver'],
        'volumes_from': cattrs['HostConfig']['VolumesFrom'],
        'cpu_shares': cattrs['HostConfig']['CpuShares'],
        'cpuset': cattrs['HostConfig']['CpusetCpus']+','+cattrs['HostConfig']['CpusetMems'],
        'entrypoint': cattrs['Config']['Entrypoint'],
        'user': cattrs['Config']['User'],
        'working_dir': cattrs['Config']['WorkingDir'],
        'domainname': cattrs['Config']['Domainname'],
        'hostname': cattrs['Config']['Hostname'],
        'ipc': cattrs['HostConfig']['IpcMode'],
        'mac_address': cattrs['NetworkSettings']['MacAddress'],
        'mem_limit': cattrs['HostConfig']['Memory'],
        'memswap_limit': cattrs['HostConfig']['MemorySwap'],
        'privileged': cattrs['HostConfig']['Privileged'],
        'restart': cattrs['HostConfig']['RestartPolicy']['Name'],
        'read_only': cattrs['HostConfig']['ReadonlyRootfs'],
        'stdin_open': cattrs['Config']['OpenStdin'],
        'tty': cattrs['Config']['Tty']
    }

    networklist = c.networks.list()
    networks = {network.attrs['Name']: {'external': (not network.attrs['Internal'])} for network in networklist if network.attrs['Name'] in values['networks'].keys()}

    # Check for command and add it if present.
    if cattrs['Config']['Cmd'] != None:
        values['command'] = " ".join(cattrs['Config']['Cmd']),

    # Check for exposed/bound ports and add them if needed.
    try:
        expose_value =  list(cattrs['Config']['ExposedPorts'].keys())
        ports_value = [cattrs['HostConfig']['PortBindings'][key][0]['HostIp']+':'+cattrs['HostConfig']['PortBindings'][key][0]['HostPort']+':'+key for key in cattrs['HostConfig']['PortBindings']]

        # If bound ports found, don't use the 'expose' value.
        if ports_value not in [None, "", [], 'null', {}, "default", 0, ",", "no"]:
            for index, port in enumerate(ports_value):
                if port[0] == ':':
                    ports_value[index] = port[1:]

            values['ports'] = ports_value
        else:
            values['expose'] = expose_value

    except (KeyError, TypeError):
        # No ports exposed/bound. Continue without them.
        ports = None

    # Iterate through values to finish building yaml dict.
    for key, value in values.items():
        if value not in [None, "", [], 'null', {}, "default", 0, ",", "no"]:
            ct[key] = value

    return cfile, networks


def generate_uuid():
    return uuid.uuid4().hex[:6].upper()


def random_string(string_length=10):
    """
    Generate a random string of fixed length
    :param string_length: integer
    :return: string
    """
    final_string = ''.join(random.choice(
        string.ascii_uppercase +
        string.ascii_lowercase +
        string.digits) for _ in range(string_length))
    final_string = profanity.censor(final_string, '').lower()

    return final_string


def generate_rand_string():
    return "".join(
      random.choice(
        string.ascii_uppercase + string.ascii_lowercase + string.digits
      ) for _ in range(16)
    )